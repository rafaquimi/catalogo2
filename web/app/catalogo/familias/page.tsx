import { prisma } from "@/lib/prisma";
import { createFamily } from "./actions";
import { FamilyRow } from "./FamilyRow";

export const dynamic = "force-dynamic";

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
          Crea, renombra o elimina familias. Si eliminas una familia, sus piezas se conservarán como “Sin familia”.
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
        <div className="hidden grid-cols-[minmax(0,1fr)_6rem_auto] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 sm:grid">
          <div>Familia</div>
          <div className="text-center">Piezas</div>
          <div className="text-right">Acciones</div>
        </div>
        {families.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">
            No hay familias todavía.
          </div>
        ) : (
          families.map((family) => <FamilyRow key={family.id} family={{ id: family.id, name: family.name, partCount: family._count.parts }} />)
        )}
      </div>
    </div>
  );
}
