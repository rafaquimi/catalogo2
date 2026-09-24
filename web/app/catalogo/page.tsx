import { prisma } from "@/lib/prisma";
import { getPrivateImageUrl } from "@/lib/private-image";
import { CatalogClient } from "./CatalogClient";
import Link from "next/link";

export const dynamic = "force-dynamic";

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(priceCents / 100);
}

export default async function CatalogoPage() {
  const [families, parts] = await Promise.all([
    prisma.family.findMany({ orderBy: { name: "asc" } }),
    prisma.part.findMany({
      include: { family: true, images: { orderBy: { createdAt: "asc" } } },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const serialized = parts.map((p) => ({
    id: p.id,
    description: p.description,
    family: p.family.name,
    familyId: p.familyId,
    priceCents: p.priceCents,
    price: formatPrice(p.priceCents),
    images: p.images.map((img) => ({
      id: img.id,
      url: getPrivateImageUrl(img.id),
    })),
  }));

  return (
    <div className="space-y-7">
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-7 text-white shadow-xl shadow-slate-300/30 dark:shadow-none sm:px-8">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold text-cyan-300">Catálogo de piezas</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Todo tu catálogo, listo para presupuestar</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">Busca una pieza, consulta sus fotos o añádela directamente a un nuevo presupuesto.</p>
          </div>
          <div className="flex shrink-0 gap-2"><Link href="/catalogo/nueva" className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/15">Nueva pieza</Link><Link href="/catalogo/presupuestos/nuevo" className="rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300">Nuevo presupuesto</Link></div>
        </div>
      </div>
      <CatalogClient parts={serialized} families={families} />
    </div>
  );
}
