"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getR2Client, getR2Bucket, getR2PublicUrl } from "@/lib/r2";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import sharp from "sharp";

const updatePartSchema = z.object({
  description: z.string().min(1),
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

  await prisma.part.update({
    where: { id },
    data: {
      description: parsed.data.description,
      familyId: parsed.data.familyId,
      priceCents: Math.round(parsed.data.price * 100),
    },
  });

  // Subir nuevas imágenes si las hay
  const files = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (files.length > 0) {
    const imagesData: { url: string; partId: string }[] = [];

    for (const file of files) {
      const inputBuf = Buffer.from(await file.arrayBuffer());
      let uploadBuf: Buffer;
      let contentType: string;
      let ext: string;

      try {
        uploadBuf = await sharp(inputBuf)
          .rotate()
          .resize({ width: 1200, withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer();
        contentType = "image/webp";
        ext = "webp";
      } catch {
        uploadBuf = inputBuf;
        contentType = file.type || "image/jpeg";
        ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      }

      const key = `uploads/${crypto.randomUUID()}.${ext}`;

      await getR2Client().send(
        new PutObjectCommand({
          Bucket: getR2Bucket(),
          Key: key,
          Body: uploadBuf,
          ContentType: contentType,
        })
      );

      imagesData.push({ url: `${getR2PublicUrl()}/${key}`, partId: id });
    }

    await prisma.partImage.createMany({ data: imagesData });
  }

  revalidatePath(`/catalogo/${id}`);
  revalidatePath("/catalogo");
  redirect(`/catalogo/${id}`);
}

export async function deletePart(id: string) {
  await requireAuth();

  // Borrar imágenes de R2
  const images = await prisma.partImage.findMany({ where: { partId: id } });
  const r2PublicUrl = getR2PublicUrl();

  for (const img of images) {
    try {
      const key = img.url.replace(`${r2PublicUrl}/`, "");
      await getR2Client().send(
        new DeleteObjectCommand({ Bucket: getR2Bucket(), Key: key })
      );
    } catch {
      // Si falla el borrado de R2 continuamos igualmente
    }
  }

  await prisma.part.delete({ where: { id } });

  revalidatePath("/catalogo");
  redirect("/catalogo");
}

export async function deleteImage(imageId: string, partId: string) {
  await requireAuth();

  const image = await prisma.partImage.findUnique({ where: { id: imageId } });
  if (!image) return;

  // Borrar de R2
  try {
    const r2PublicUrl = getR2PublicUrl();
    const key = image.url.replace(`${r2PublicUrl}/`, "");
    await getR2Client().send(
      new DeleteObjectCommand({ Bucket: getR2Bucket(), Key: key })
    );
  } catch {
    // Si falla R2 borramos igualmente de la BD
  }

  await prisma.partImage.delete({ where: { id: imageId } });

  revalidatePath(`/catalogo/${partId}`);
  revalidatePath(`/catalogo/${partId}/editar`);
  revalidatePath("/catalogo");
}
