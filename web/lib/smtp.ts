import "server-only";

import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/secret-crypto";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
}

export async function getSmtpConfig(): Promise<SmtpConfig | null> {
  try {
    const stored = await prisma.emailSettings.findUnique({ where: { id: "default" } });
    if (stored?.enabled && stored.host && stored.user && stored.fromAddress && stored.passwordEncrypted) {
      return {
        host: stored.host,
        port: stored.port,
        secure: stored.secure,
        user: stored.user,
        password: decryptSecret(stored.passwordEncrypted),
        from: stored.fromAddress,
      };
    }
  } catch (error) {
    console.warn("No se ha podido leer la configuración SMTP de la base de datos.", error);
  }

  if (![process.env.SMTP_HOST, process.env.SMTP_USER, process.env.SMTP_PASSWORD, process.env.SMTP_FROM].every(Boolean)) return null;
  return {
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER!,
    password: process.env.SMTP_PASSWORD!,
    from: process.env.SMTP_FROM!,
  };
}

export function createSmtpTransport(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.password },
  });
}
