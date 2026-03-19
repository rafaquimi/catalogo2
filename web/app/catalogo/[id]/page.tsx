import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(priceCents / 100);
}

export default async function PiezaDetallePage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  const part = await prisma.part.findUnique({
    where: { id },
    include: { family: true, images: { orderBy: { createdAt: "asc" } } },
  });

  if (!part) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs text-zinc-500">{part.family.name}</div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {part.description}
          </h1>
          <div className="text-lg">{formatPrice(part.priceCents)}</div>
        </div>
        <Link
          href="/catalogo"
          className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-zinc-900"
        >
          Volver
        </Link>
      </div>

      {part.images.length === 0 ? (
        <div className="rounded-2xl border border-black/10 bg-white p-6 text-sm text-zinc-600 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-400">
          Esta pieza no tiene imágenes todavía.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {part.images.map((img: { id: string; url: string }) => (
            <a
              key={img.id}
              href={img.url}
              target="_blank"
              rel="noreferrer"
              className="group overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm hover:shadow-md dark:border-white/10 dark:bg-zinc-950"
            >
              <div className="relative aspect-[4/3] w-full bg-zinc-100 dark:bg-zinc-900">
                <Image
                  src={img.url}
                  alt={part.description}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  sizes="(max-width: 1024px) 50vw, 33vw"
                />
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

