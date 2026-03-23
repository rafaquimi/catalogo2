import { prisma } from "@/lib/prisma";
import { createFamily } from "./actions";

export default async function FamiliasPage() {
  const families = await prisma.family.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { parts: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Familias</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Crea familias para clasificar tus piezas.
        </p>
      </div>

      <form
        action={createFamily}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nueva familia</label>
            <input
              name="name"
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-3 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800"
              placeholder="Ej: Herrajes"
            />
          </div>
          <button className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm">
            Guardar
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-3 gap-0 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
          <div>Familia</div>
          <div className="text-center">Piezas</div>
          <div className="text-right">ID</div>
        </div>
        {families.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">
            No hay familias todavía.
          </div>
        ) : (
          families.map((f) => (
            <div
              key={f.id}
              className="grid grid-cols-3 items-center gap-0 border-b border-slate-100 px-5 py-3.5 text-sm last:border-b-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"
            >
              <div className="font-medium text-slate-800 dark:text-slate-100">{f.name}</div>
              <div className="text-center">
                <span className="inline-flex items-center justify-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  {f._count.parts}
                </span>
              </div>
              <div className="text-right font-mono text-xs text-slate-400">
                {f.id}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
