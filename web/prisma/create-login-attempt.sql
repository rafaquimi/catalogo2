-- Ejecutar en el SQL Editor de Supabase
-- https://supabase.com/dashboard → tu proyecto → SQL Editor

CREATE TABLE IF NOT EXISTS "LoginAttempt" (
  id        TEXT        PRIMARY KEY,
  email     TEXT        NOT NULL,
  ip        TEXT        NOT NULL DEFAULT 'unknown',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Esta tabla solo se usa desde Prisma mediante la conexión privada del
-- servidor. No debe ser accesible con las claves públicas de Supabase.
ALTER TABLE "LoginAttempt" ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS "LoginAttempt_email_createdAt_idx"
  ON "LoginAttempt" (email, "createdAt");

CREATE INDEX IF NOT EXISTS "LoginAttempt_ip_createdAt_idx"
  ON "LoginAttempt" (ip, "createdAt");
