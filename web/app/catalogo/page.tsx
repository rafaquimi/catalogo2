import { prisma } from "@/lib/prisma";
import { CatalogClient } from "./CatalogClient";

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
    images: p.images.map((img) => ({ id: img.id, url: img.url })),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Piezas</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Busca, filtra por familia y ordena por precio.
        </p>
      </div>
      <CatalogClient parts={serialized} families={families} />
    </div>
  );
}
