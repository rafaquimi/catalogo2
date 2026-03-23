import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Máximo de intentos fallidos antes de bloquear temporalmente
const MAX_ATTEMPTS = 10;
// Ventana de tiempo en minutos para contar intentos
const WINDOW_MINUTES = 15;

async function checkRateLimit(email: string): Promise<boolean> {
  try {
    const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
    const count = await prisma.loginAttempt.count({
      where: { email, createdAt: { gte: since } },
    });
    return count >= MAX_ATTEMPTS;
  } catch {
    // Si la tabla aún no existe o hay error de BD, no bloquear el login
    return false;
  }
}

async function recordFailedAttempt(email: string) {
  try {
    await prisma.loginAttempt.create({ data: { email } });
    // Limpiar intentos antiguos (> 24h) para no crecer indefinidamente
    await prisma.loginAttempt.deleteMany({
      where: { email, createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
  } catch {
    // Si falla el registro del intento, continuar igualmente
  }
}

async function clearAttempts(email: string) {
  try {
    await prisma.loginAttempt.deleteMany({ where: { email } });
  } catch {
    // Si falla la limpieza, continuar igualmente
  }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        // Comprobar si la cuenta está bloqueada por demasiados intentos
        const blocked = await checkRateLimit(email);
        if (blocked) {
          // Lanzamos un error con mensaje específico para mostrarlo en el login
          throw new Error("Demasiados intentos. Espera 15 minutos.");
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          // Registrar intento incluso si el usuario no existe (evita enumeración de usuarios)
          await recordFailedAttempt(email);
          return null;
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
          await recordFailedAttempt(email);
          return null;
        }

        // Login correcto: limpiar intentos fallidos
        await clearAttempts(email);
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
