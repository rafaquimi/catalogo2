"use client";

import { signOut } from "next-auth/react";
import { useState, useTransition } from "react";
import { updateAccount } from "./actions";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-3 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800";

export function CuentaForm({ email }: { email: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await updateAccount(formData);
      if (!result.ok) {
        setError(result.error || "No se ha podido guardar el cambio.");
        return;
      }

      await signOut({ callbackUrl: "/login?cuentaActualizada=1" });
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Correo electrónico
            </label>
            <input name="email" type="email" autoComplete="email" defaultValue={email} required className={inputClass} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Contraseña actual
            </label>
            <input name="currentPassword" type="password" autoComplete="current-password" required className={inputClass} />
            <p className="text-xs text-slate-500">Es obligatoria para confirmar cualquier cambio.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Contraseña nueva</label>
              <input name="newPassword" type="password" autoComplete="new-password" minLength={12} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Repetir contraseña nueva</label>
              <input name="confirmPassword" type="password" autoComplete="new-password" minLength={12} className={inputClass} />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Déjalas vacías si solamente quieres cambiar el correo. La contraseña nueva debe tener al menos 12 caracteres.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <button type="submit" disabled={isPending} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60">
        {isPending ? "Guardando…" : "Guardar y volver a iniciar sesión"}
      </button>
    </form>
  );
}
