"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getAuditActor } from "@/lib/audit";
import {
  deleteUploadedImages,
  getImageFiles,
  uploadImages,
  validateImageFiles,
} from "@/lib/image-storage";
import { MAX_IMAGES_PER_PART } from "@/lib/image-rules";

const updatePartSchema = z.object({
  reference: z.string().trim().max(100),
  description: z.string().trim().min(1).max(500),
  familyId: z.string().min(1),
  cost: z.string().min(1).transform((v, ctx) => {
    const n = parseFloat(v.replace(",", "."));
    if (isNaN(n) || n < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Coste inválido" });
      return z.NEVER;
    }
    return n;
  }),
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
  const actor = getAuditActor(await requireAuth());

  const raw = {
    reference: String(formData.get("reference") ?? ""),
    description: String(formData.get("description") ?? ""),
    familyId: String(formData.get("familyId") ?? ""),
    cost: String(formData.get("cost") ?? ""),
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
      const previous = await transaction.part.findUniqueOrThrow({
        where: { id },
        select: { reference: true, description: true, familyId: true, costCents: true, priceCents: true },
      });
      const updated = await transaction.part.update({
        where: { id },
        data: {
          reference: parsed.data.reference || null,
          description: parsed.data.description,
          familyId: parsed.data.familyId,
          costCents: Math.round(parsed.data.cost * 100),
          priceCents: Math.round(parsed.data.price * 100),
        },
      });

      if (uploaded.length > 0) {
        await transaction.partImage.createMany({
          data: uploaded.map(({ url }) => ({ url, partId: id })),
        });
      }

      await transaction.auditLog.create({
        data: {
          actorUserId: actor.userId,
          actorEmail: actor.email,
          action: "UPDATE",
          entityType: "PART",
          entityId: id,
          summary: `Pieza actualizada: ${updated.description}`,
          changes: {
            before: previous,
            after: {
              reference: updated.reference,
              description: updated.description,
              familyId: updated.familyId,
              costCents: updated.costCents,
              priceCents: updated.priceCents,
            },
            addedImages: uploaded.map(({ url }) => url),
          },
        },
      });
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
  const actor = getAuditActor(await requireAuth());

  await prisma.$transaction(async (transaction) => {
    const part = await transaction.part.findUniqueOrThrow({
      where: { id },
      include: {
        family: { select: { id: true, name: true } },
        images: { select: { id: true, url: true } },
      },
    });

    await transaction.part.delete({ where: { id } });
    await transaction.auditLog.create({
      data: {
        actorUserId: actor.userId,
        actorEmail: actor.email,
        action: "DELETE",
        entityType: "PART",
        entityId: id,
        summary: `Pieza eliminada: ${part.description}`,
        changes: {
          snapshot: {
            reference: part.reference,
            description: part.description,
            costCents: part.costCents,
            priceCents: part.priceCents,
            family: part.family,
            images: part.images,
          },
          imagesRetainedInR2: true,
        },
      },
    });
  });

  revalidatePath("/catalogo");
  redirect("/catalogo");
}

export async function deleteImage(imageId: string, partId: string) {
  const actor = getAuditActor(await requireAuth());

  const deleted = await prisma.$transaction(async (transaction) => {
    const image = await transaction.partImage.findFirst({
      where: { id: imageId, partId },
    });
    if (!image) return false;

    await transaction.partImage.delete({ where: { id: imageId } });
    await transaction.auditLog.create({
      data: {
        actorUserId: actor.userId,
        actorEmail: actor.email,
        action: "DELETE",
        entityType: "PART_IMAGE",
        entityId: imageId,
        summary: "Imagen retirada de una pieza",
        changes: { partId, url: image.url, retainedInR2: true },
      },
    });
    return true;
  });

  if (!deleted) return;

  revalidatePath(`/catalogo/${partId}`);
  revalidatePath(`/catalogo/${partId}/editar`);
  revalidatePath("/catalogo");
}
