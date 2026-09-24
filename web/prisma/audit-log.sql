-- Ejecutar una sola vez en Supabase > SQL Editor antes de desplegar esta versión.
CREATE TABLE IF NOT EXISTS public."AuditLog" (
  "id" TEXT NOT NULL,
  "actorUserId" TEXT,
  "actorEmail" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "summary" TEXT NOT NULL,
  "changes" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx"
  ON public."AuditLog" ("createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_idx"
  ON public."AuditLog" ("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "AuditLog_actorUserId_createdAt_idx"
  ON public."AuditLog" ("actorUserId", "createdAt");

-- La aplicación accede por la conexión directa de Prisma. La Data API continúa
-- sin permisos para anon/authenticated, como se configuró en el punto 2.
ALTER TABLE public."AuditLog" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."AuditLog" FROM anon, authenticated;
