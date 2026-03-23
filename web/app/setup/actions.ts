"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const setupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10, "La contraseña debe tener al menos 10 caracteres"),
});

export async function createAdmin(formData: FormData) {
  const hasUsers = (await prisma.user.count()) > 0;
  if (hasUsers) redirect("/login");

  const raw = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };

  const parsed = setupSchema.safeParse(raw);
  if (!parsed.success) throw new Error("Revisa el email y la contraseña.");

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.create({
    data: { email: parsed.data.email, passwordHash },
  });

  redirect("/login");
}

