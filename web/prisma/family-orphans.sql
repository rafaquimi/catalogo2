-- Permite conservar las piezas cuando se elimina su familia.
-- Ejecutar una sola vez en Supabase > SQL Editor antes de desplegar el código.

ALTER TABLE public."Part"
  ALTER COLUMN "familyId" DROP NOT NULL;

ALTER TABLE public."Part"
  DROP CONSTRAINT IF EXISTS "Part_familyId_fkey";

ALTER TABLE public."Part"
  ADD CONSTRAINT "Part_familyId_fkey"
  FOREIGN KEY ("familyId")
  REFERENCES public."Family"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
