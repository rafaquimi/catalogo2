import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

// Limita tanto los intentos contra una cuenta desde una IP como el barrido de
// muchas cuentas desde la misma IP.
const MAX_ATTEMPTS_PER_ACCOUNT_AND_IP = 10;
const MAX_ATTEMPTS_PER_IP = 30;
const WINDOW_MINUTES = 15;
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

// Evita que el tiempo de respuesta revele si el email existe.
const DUMMY_PASSWORD_HASH =
  "$2b$12$iatkygh7JfH7YXW/3YMcwesM5hieKYYpy7Hx9wILbJN9MNJW.cZQu";

function getClientIp(headers: Record<string, string> | undefined): string {
  const forwardedFor = headers?.["x-forwarded-for"];
  return forwardedFor?.split(",")[0]?.trim().slice(0, 64) || "unknown";
}

async function checkRateLimit(email: string, ip: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
  const [accountAndIpAttempts, ipAttempts] = await Promise.all([
    prisma.loginAttempt.count({
      where: { email, ip, createdAt: { gte: since } },
    }),
    prisma.loginAttempt.count({
      where: { ip, createdAt: { gte: since } },
    }),
  ]);

  return (
    accountAndIpAttempts >= MAX_ATTEMPTS_PER_ACCOUNT_AND_IP ||
    ipAttempts >= MAX_ATTEMPTS_PER_IP
  );
}

async function recordFailedAttempt(email: string, ip: string) {
  await prisma.loginAttempt.create({ data: { email, ip } });
}

async function clearAttempts(email: string, ip: string) {
  await prisma.loginAttempt.deleteMany({ where: { email, ip } });
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  jwt: {
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(raw, request) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const ip = getClientIp(request.headers);

        let blocked: boolean;
        try {
          blocked = await checkRateLimit(email, ip);
        } catch (error) {
          console.error("No se ha podido comprobar el límite de acceso", error);
          // Fallo seguro: si la protección no está operativa, no aceptamos logins.
          throw new Error("Servicio de seguridad no disponible.");
        }

        if (blocked) {
          throw new Error("Demasiados intentos. Espera 15 minutos.");
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          await Promise.all([
            bcrypt.compare(password, DUMMY_PASSWORD_HASH),
            recordFailedAttempt(email, ip),
          ]);
          return null;
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
          await recordFailedAttempt(email, ip);
          return null;
        }

        // Login correcto: limpiar intentos fallidos
        await clearAttempts(email, ip);
        return { id: user.id, email: user.email };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.sub ?? undefined;
      }
      return session;
    },
  },
};
