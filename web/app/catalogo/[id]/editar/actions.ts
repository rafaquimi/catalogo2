"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getR2Bucket, getR2Client } from "@/lib/r2";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import {
  deleteUploadedImages,
  getImageFiles,
  getR2KeyFromUrl,
  uploadImages,
  validateImageFiles,
} from "@/lib/image-storage";
import { MAX_IMAGES_PER_PART } from "@/lib/image-rules";

const updatePartSchema = z.object({
  description: z.string().trim().min(1).max(500),
  familyId: z.string().min(1),
  price: z.string().min(1).transform((v, ctx) => {
    const n = parseFloat(v.replace(",", "."));
    if (isNaN(n) || n < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Precio inválido" });
      return z.NEVER;
    }
    return n;
  }),
});

export async function updatePart(id: string, formData: FormData) {
  await requireAuth();

  const raw = {
    description: String(formData.get("description") ?? ""),
    familyId: String(formData.get("familyId") ?? ""),
    price: String(formData.get("price") ?? ""),
  };

  const parsed = updatePartSchema.safeParse(raw);
  if (!parsed.success) throw new Error("Datos inválidos.");

  const files = getImageFiles(formData);
  const existingImages = await prisma.partImage.count({ where: { partId: id } });
  validateImageFiles(files, MAX_IMAGES_PER_PART - existingImages);

  const uploaded = await uploadImages(files);

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.part.update({
        where: { id },
        data: {
          description: parsed.data.description,
          familyId: parsed.data.familyId,
          priceCents: Math.round(parsed.data.price * 100),
        },
      });

      if (uploaded.length > 0) {
        await transaction.partImage.createMany({
          data: uploaded.map(({ url }) => ({ url, partId: id })),
        });
      }
    });
  } catch (error) {
    await deleteUploadedImages(uploaded);
    throw error;
  }

  revalidatePath(`/catalogo/${id}`);
  revalidatePath("/catalogo");
  redirect(`/catalogo/${id}`);
}

export async function deletePart(id: string) {
  await requireAuth();

  const images = await prisma.partImage.findMany({ where: { partId: id } });
  await prisma.part.delete({ where: { id } });

  for (const img of images) {
    try {
      const key = getR2KeyFromUrl(img.url);
      if (!key) continue;
      await getR2Client().send(
        new DeleteObjectCommand({ Bucket: getR2Bucket(), Key: key })
      );
    } catch {
      // Si falla el borrado de R2 continuamos igualmente
    }
  }

  revalidatePath("/catalogo");
  redirect("/catalogo");
}

export async function deleteImage(imageId: string, partId: string) {
  await requireAuth();

  const image = await prisma.partImage.findFirst({
    where: { id: imageId, partId },
  });
  if (!image) return;

  await prisma.partImage.delete({ where: { id: imageId } });

  try {
    const key = getR2KeyFromUrl(image.url);
    if (key) {
      await getR2Client().send(
        new DeleteObjectCommand({ Bucket: getR2Bucket(), Key: key })
      );
    }
  } catch {
    // Si falla R2 borramos igualmente de la BD
  }

  revalidatePath(`/catalogo/${partId}`);
  revalidatePath(`/catalogo/${partId}/editar`);
  revalidatePath("/catalogo");
}
