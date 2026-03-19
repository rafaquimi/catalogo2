import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const hasUsers = (await prisma.user.count()) > 0;

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-950 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-950">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Catálogo del Taller
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Inicia sesión para acceder al catálogo.
            </p>
          </div>

          <div className="mt-6">
            {hasUsers ? (
              <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />}>
                <LoginForm />
              </Suspense>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                  No hay usuarios creados todavía. Primero crea el usuario
                  administrador.
                </div>
                <Link
                  className="inline-flex w-full items-center justify-center rounded-xl bg-black px-4 py-3 text-sm font-medium text-white hover:bg-black/90"
                  href="/setup"
                >
                  Crear administrador
                </Link>
              </div>
            )}
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-zinc-500">
          Consejo: en móvil puedes añadir fotos desde archivo o cámara.
        </p>
      </div>
    </div>
  );
}

