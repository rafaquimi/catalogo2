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

const createPartSchema = z.object({
  description: z.string().trim().min(1).max(500),
  familyId: z.string().min(1),
  price: z
    .string()
    .min(1)
    .transform((v, ctx) => {
      const n = parseFloat(v.replace(",", "."));
      if (isNaN(n) || n < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Precio inválido" });
        return z.NEVER;
      }
      return n;
    }),
});

export async function createPart(formData: FormData) {
  const actor = getAuditActor(await requireAuth());

  const raw = {
    description: String(formData.get("description") ?? ""),
    familyId: String(formData.get("familyId") ?? ""),
    price: String(formData.get("price") ?? ""),
  };

  const parsed = createPartSchema.safeParse(raw);
  if (!parsed.success) throw new Error("Datos inválidos.");

  const files = getImageFiles(formData);
  validateImageFiles(files);

  const priceCents = Math.round(parsed.data.price * 100);

  const uploaded = await uploadImages(files);
  let part;

  try {
    part = await prisma.$transaction(async (transaction) => {
      const createdPart = await transaction.part.create({
        data: {
          description: parsed.data.description,
          familyId: parsed.data.familyId,
          priceCents,
          images: {
            create: uploaded.map(({ url }) => ({ url })),
          },
        },
      });

      await transaction.auditLog.create({
        data: {
          actorUserId: actor.userId,
          actorEmail: actor.email,
          action: "CREATE",
          entityType: "PART",
          entityId: createdPart.id,
          summary: `Pieza creada: ${createdPart.description}`,
          changes: {
            description: createdPart.description,
            familyId: createdPart.familyId,
            priceCents: createdPart.priceCents,
            imageCount: uploaded.length,
          },
        },
      });

      return createdPart;
    });
  } catch (error) {
    await deleteUploadedImages(uploaded);
    throw error;
  }

  revalidatePath("/catalogo");
  redirect(`/catalogo/${part.id}`);
}
