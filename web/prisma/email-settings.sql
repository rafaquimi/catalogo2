-- Ejecutar una sola vez en Supabase > SQL Editor.
-- Después, el correo se administra desde Empresa y PDF.
CREATE TABLE IF NOT EXISTS public."EmailSettings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "enabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "host" TEXT NOT NULL DEFAULT '',
  "port" INTEGER NOT NULL DEFAULT 587,
  "secure" BOOLEAN NOT NULL DEFAULT FALSE,
  "user" TEXT NOT NULL DEFAULT '',
  "passwordEncrypted" TEXT,
  "fromAddress" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailSettings_pkey" PRIMARY KEY ("id")
);

ALTER TABLE public."EmailSettings" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."EmailSettings" FROM anon, authenticated;
