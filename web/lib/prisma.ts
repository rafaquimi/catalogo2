import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pool?: Pool;
};

function getPool(): Pool {
  if (!globalForPrisma.pool) {
    if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL");
    globalForPrisma.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
    });
  }
  return globalForPrisma.pool;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(getPool()),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
