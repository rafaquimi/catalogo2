import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  // Next.js importa las rutas durante `next build`. Las Preview de Vercel no
  // deben necesitar acceso a la base de datos de producción solo para compilar.
  // Si una ruta intenta usar Prisma sin configurar DATABASE_URL, el error sigue
  // siendo explícito y se produce en ese momento.
  if (!connectionString) {
    return new Proxy({} as PrismaClient, {
      get() {
        throw new Error("Falta DATABASE_URL");
      },
    });
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
