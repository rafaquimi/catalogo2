"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getAuditActor } from "@/lib/audit";

const familySchema = z.object({
  name: z.string().min(1),
});

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

  revalidatePath("/catalogo/familias");
  revalidatePath("/catalogo/nueva");
  revalidatePath("/catalogo");
}
