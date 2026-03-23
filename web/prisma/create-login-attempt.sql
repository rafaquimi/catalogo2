-- Ejecutar en el SQL Editor de Supabase
-- https://supabase.com/dashboard → tu proyecto → SQL Editor

CREATE TABLE IF NOT EXISTS "LoginAttempt" (
  id        TEXT        PRIMARY KEY,
  email     TEXT        NOT NULL,
  ip        TEXT        NOT NULL DEFAULT 'unknown',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "LoginAttempt_email_createdAt_idx"
  ON "LoginAttempt" (email, "createdAt");
