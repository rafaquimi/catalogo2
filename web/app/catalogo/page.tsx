import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

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
          {parts.map((p) => {
            const cover = p.images[0]?.url ?? null;
            return (
              <Link
                key={p.id}
                href={`/catalogo/${p.id}`}
                className="group overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm hover:shadow-md dark:border-white/10 dark:bg-zinc-950"
              >
                <div className="relative aspect-[4/3] w-full bg-zinc-100 dark:bg-zinc-900">
                  {cover ? (
                    <Image
                      src={cover}
                      alt={p.description}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      sizes="(max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
                      Sin imagen
                    </div>
                  )}
                </div>
                <div className="space-y-1 p-4">
                  <div className="text-xs text-zinc-500">{p.family.name}</div>
                  <div className="text-sm font-medium">{p.description}</div>
                  <div className="text-sm">{formatPrice(p.priceCents)}</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

