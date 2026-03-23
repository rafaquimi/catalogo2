"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";

const familySchema = z.object({
  name: z.string().min(1),
});

export async function createFamily(formData: FormData) {
  await requireAuth();

  const raw = { name: String(formData.get("name") ?? "").trim() };
  const parsed = familySchema.safeParse(raw);
  if (!parsed.success) return;

  await prisma.family.upsert({
    where: { name: parsed.data.name },
    update: {},
    create: { name: parsed.data.name },
  });

  revalidatePath("/catalogo/familias");
  revalidatePath("/catalogo/nueva");
  revalidatePath("/catalogo");
}

