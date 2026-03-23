import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NuevaPiezaForm } from "./NuevaPiezaForm";

export default async function NuevaPiezaPage() {
  const families = await prisma.family.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Nueva pieza</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Añade fotos una a una desde cámara o galería.
        </p>
      </div>

      {families.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Antes de dar de alta piezas, crea al menos una familia.
          </p>
          <div className="mt-4">
            <Link
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
              href="/catalogo/familias"
            >
              Ir a familias
            </Link>
          </div>
        </div>
      ) : (
        <NuevaPiezaForm families={families} />
      )}
    </div>
  );
}
