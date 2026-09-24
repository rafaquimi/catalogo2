"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { getAuditActor } from "@/lib/audit";

export interface UpdateAccountResult {
  ok: boolean;
  error?: string;
}

const accountSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Introduce un correo válido."),
    currentPassword: z.string().min(1, "Introduce tu contraseña actual."),
    newPassword: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword && data.newPassword.length < 12) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPassword"],
        message: "La contraseña nueva debe tener al menos 12 caracteres.",
      });
    }

    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Las contraseñas nuevas no coinciden.",
      });
    }
  });

export async function updateAccount(
  formData: FormData,
): Promise<UpdateAccountResult> {
  const session = await requireAuth();
  const actor = getAuditActor(session);
  const userId = (session.user as { id?: string } | undefined)?.id;
  if (!userId) return { ok: false, error: "La sesión no es válida." };

  const parsed = accountSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || "Revisa los datos." };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "El usuario ya no existe." };

  const passwordIsValid = await bcrypt.compare(
    parsed.data.currentPassword,
    user.passwordHash,
  );
  if (!passwordIsValid) {
    return { ok: false, error: "La contraseña actual no es correcta." };
  }

  if (parsed.data.email !== user.email) {
    const emailInUse = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });
    if (emailInUse && emailInUse.id !== userId) {
      return { ok: false, error: "Ese correo ya está siendo utilizado." };
    }
  }

  const passwordHash = parsed.data.newPassword
    ? await bcrypt.hash(parsed.data.newPassword, 12)
    : user.passwordHash;

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: userId },
        data: { email: parsed.data.email, passwordHash },
      });
      await transaction.loginAttempt.deleteMany({
        where: { email: { in: [user.email, parsed.data.email] } },
      });
      await transaction.auditLog.create({
        data: {
          actorUserId: actor.userId,
          actorEmail: actor.email,
          action: "UPDATE",
          entityType: "ACCOUNT",
          entityId: userId,
          summary: "Cuenta administradora actualizada",
          changes: {
            emailChanged: parsed.data.email !== user.email,
            passwordChanged: Boolean(parsed.data.newPassword),
          },
        },
      });
    });
  } catch (error) {
    console.error("No se ha podido actualizar la cuenta", error);
    return { ok: false, error: "No se ha podido guardar el cambio." };
  }

  revalidatePath("/catalogo", "layout");
  return { ok: true };
}
