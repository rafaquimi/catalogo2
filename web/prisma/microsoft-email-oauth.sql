-- Ejecutar una sola vez en Supabase > SQL Editor.
-- Permite conectar una cuenta Outlook.com/Hotmail mediante OAuth2.
CREATE TABLE IF NOT EXISTS public."MicrosoftEmailConnection" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "accountEmail" TEXT NOT NULL,
  "displayName" TEXT NOT NULL DEFAULT '',
  "refreshTokenEncrypted" TEXT NOT NULL,
  "connectedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MicrosoftEmailConnection_pkey" PRIMARY KEY ("id")
);

ALTER TABLE public."MicrosoftEmailConnection" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."MicrosoftEmailConnection" FROM anon, authenticated;
