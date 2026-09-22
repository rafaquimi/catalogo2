import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { createAdmin } from "./actions";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const hasUsers = (await prisma.user.count()) > 0;
  if (hasUsers) redirect("/login");

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-950 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-950">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Configuración inicial
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Crea el usuario administrador (solo se hace una vez).
            </p>
          </div>

          <form className="mt-6 space-y-4" action={createAdmin}>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <input
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10 dark:border-white/10 dark:bg-zinc-950"
                type="email"
                name="email"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Contraseña</label>
              <input
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10 dark:border-white/10 dark:bg-zinc-950"
                type="password"
                name="password"
                minLength={10}
                required
              />
              <p className="text-xs text-zinc-500">
                Mínimo 10 caracteres.
              </p>
            </div>
            <button className="inline-flex w-full items-center justify-center rounded-xl bg-black px-4 py-3 text-sm font-medium text-white hover:bg-black/90">
              Crear administrador
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
