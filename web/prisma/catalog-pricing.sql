-- Ejecutar una sola vez en Supabase SQL Editor antes de desplegar el código.
-- Los valores por defecto permiten conservar todas las piezas y la empresa existentes.

ALTER TABLE public."Part"
  ADD COLUMN IF NOT EXISTS "reference" TEXT,
  ADD COLUMN IF NOT EXISTS "costCents" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public."CompanySettings"
  ADD COLUMN IF NOT EXISTS "tradeName" TEXT NOT NULL DEFAULT '';
