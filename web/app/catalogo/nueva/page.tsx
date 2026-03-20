import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createPart } from "./actions";

export default async function NuevaPiezaPage() {
  const families = await prisma.family.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nueva pieza</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Puedes añadir varias fotos (archivo o cámara desde móvil).
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
        <form
          action={createPart}
          className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-950"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-2">
              <label className="text-sm font-medium">Descripción</label>
              <textarea
                name="description"
                required
                rows={3}
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10 dark:border-white/10 dark:bg-zinc-950"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Familia</label>
              <select
                name="familyId"
                required
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10 dark:border-white/10 dark:bg-zinc-950"
                defaultValue={families[0]?.id ?? ""}
              >
                {families.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Precio (EUR)</label>
              <input
                name="price"
                required
                inputMode="decimal"
                placeholder="Ej: 12,50"
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10 dark:border-white/10 dark:bg-zinc-950"
              />
            </div>

            <div className="sm:col-span-2 space-y-2">
              <label className="text-sm font-medium">Imágenes</label>
              <input
                name="images"
                type="file"
                accept="image/*,image/heic,image/heif"
                multiple
                className="block w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-zinc-950"
              />
              <p className="text-xs text-zinc-500">
                Puedes seleccionar varias fotos a la vez. En móvil te preguntará si usar cámara o galería.
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <Link
              href="/catalogo"
              className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-zinc-900"
            >
              Cancelar
            </Link>
            <button className="rounded-xl bg-black px-4 py-3 text-sm font-medium text-white hover:bg-black/90">
              Guardar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

