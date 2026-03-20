import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NuevaPiezaForm } from "./NuevaPiezaForm";

export default async function NuevaPiezaPage() {
  const families = await prisma.family.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nueva pieza</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Añade fotos una a una desde cámara o galería.
        </p>
      </div>

      {families.length === 0 ? (
        <div className="rounded-2xl border border-black/10 bg-white p-6 text-sm dark:border-white/10 dark:bg-zinc-950">
          <p className="text-zinc-700 dark:text-zinc-300">
            Antes de dar de alta piezas, crea al menos una familia.
          </p>
          <div className="mt-4">
            <Link
              className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-3 text-sm font-medium text-white hover:bg-black/90"
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
