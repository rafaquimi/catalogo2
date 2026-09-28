"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getAuditActor } from "@/lib/audit";

const familySchema = z.object({
  name: z.string().trim().min(1).max(100),
});

function revalidateFamilyViews() {
  revalidatePath("/catalogo/familias");
  revalidatePath("/catalogo/nueva");
  revalidatePath("/catalogo");
  revalidatePath("/catalogo/presupuestos");
  revalidatePath("/catalogo/presupuestos/nuevo");
}

export async function createFamily(formData: FormData) {
  const actor = getAuditActor(await requireAuth());

  const raw = { name: String(formData.get("name") ?? "").trim() };
  const parsed = familySchema.safeParse(raw);
  if (!parsed.success) return;

  await prisma.$transaction(async (transaction) => {
    const existing = await transaction.family.findUnique({
      where: { name: parsed.data.name },
      select: { id: true },
    });
    if (existing) return;

    const family = await transaction.family.create({
      data: { name: parsed.data.name },
    });
    await transaction.auditLog.create({
      data: {
        actorUserId: actor.userId,
        actorEmail: actor.email,
        action: "CREATE",
        entityType: "FAMILY",
        entityId: family.id,
        summary: `Familia creada: ${family.name}`,
        changes: { name: family.name },
      },
    });
  });

  revalidateFamilyViews();
}

export async function updateFamily(id: string, formData: FormData) {
  const actor = getAuditActor(await requireAuth());
  const parsed = familySchema.safeParse({ name: String(formData.get("name") ?? "") });
  if (!parsed.success) throw new Error("El nombre de la familia no es válido.");

  await prisma.$transaction(async (transaction) => {
    const previous = await transaction.family.findUniqueOrThrow({ where: { id } });
    const duplicate = await transaction.family.findFirst({
      where: { name: parsed.data.name, NOT: { id } },
      select: { id: true },
    });
    if (duplicate) throw new Error("Ya existe una familia con ese nombre.");

    const family = await transaction.family.update({
      where: { id },
      data: { name: parsed.data.name },
    });
    await transaction.auditLog.create({
      data: {
        actorUserId: actor.userId,
        actorEmail: actor.email,
        action: "UPDATE",
        entityType: "FAMILY",
        entityId: family.id,
        summary: `Familia renombrada: ${previous.name} → ${family.name}`,
        changes: { before: { name: previous.name }, after: { name: family.name } },
      },
    });
  });

  revalidateFamilyViews();
}

export async function deleteFamily(id: string) {
  const actor = getAuditActor(await requireAuth());

  await prisma.$transaction(async (transaction) => {
    const family = await transaction.family.findUniqueOrThrow({
      where: { id },
      include: { _count: { select: { parts: true } } },
    });

    await transaction.family.delete({ where: { id } });
    await transaction.auditLog.create({
      data: {
        actorUserId: actor.userId,
        actorEmail: actor.email,
        action: "DELETE",
        entityType: "FAMILY",
        entityId: family.id,
        summary: `Familia eliminada: ${family.name}`,
        changes: { name: family.name, orphanedParts: family._count.parts },
      },
    });
  });

  revalidateFamilyViews();
}
