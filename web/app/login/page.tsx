import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const hasUsers = (await prisma.user.count()) > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Logo / título */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-3xl font-black text-white shadow-lg backdrop-blur-sm">
            C
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Catálogo del Taller</h1>
          <p className="text-blue-200 text-sm">Inicia sesión para acceder al catálogo.</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white p-8 shadow-2xl shadow-blue-900/40 dark:bg-slate-900">
          {hasUsers ? (
            <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />}>
              <LoginForm />
            </Suspense>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-400/30 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                No hay usuarios creados todavía. Primero crea el usuario administrador.
              </div>
              <Link
                className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                href="/setup"
              >
                Crear administrador
              </Link>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-blue-300">
          En móvil puedes añadir fotos desde archivo o cámara.
        </p>
      </div>
    </div>
  );
}
