import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CatalogCard } from "./CatalogCard";

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(priceCents / 100);
}

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<{ familia?: string }>;
}) {
  const { familia } = await searchParams;

  const families = await prisma.family.findMany({
    orderBy: { name: "asc" },
  });

  const parts = await prisma.part.findMany({
    where: familia ? { familyId: familia } : undefined,
    include: { family: true, images: { orderBy: { createdAt: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Piezas</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Filtra por familia y abre cada pieza para ver sus fotos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/catalogo"
            className={`rounded-full border px-3 py-1.5 text-xs ${
              !familia
                ? "border-black/20 bg-black text-white dark:border-white/20"
                : "border-black/10 bg-white hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-zinc-900"
            }`}
          >
            Todas
          </Link>
          {families.map((f) => (
            <Link
              key={f.id}
              href={`/catalogo?familia=${encodeURIComponent(f.id)}`}
              className={`rounded-full border px-3 py-1.5 text-xs ${
                familia === f.id
                  ? "border-black/20 bg-black text-white dark:border-white/20"
                  : "border-black/10 bg-white hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-zinc-900"
              }`}
            >
              {f.name}
            </Link>
          ))}
        </div>
      </div>

      {parts.length === 0 ? (
        <div className="rounded-2xl border border-black/10 bg-white p-6 text-sm text-zinc-600 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-400">
          No hay piezas todavía.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {parts.map((p) => (
            <CatalogCard
              key={p.id}
              id={p.id}
              description={p.description}
              family={p.family.name}
              price={formatPrice(p.priceCents)}
              images={p.images.map((img) => ({ id: img.id, url: img.url }))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

