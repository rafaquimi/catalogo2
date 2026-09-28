import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPrivateImageUrl } from "@/lib/private-image";

export const dynamic = "force-dynamic";

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(priceCents / 100);
}

export default async function PiezaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const part = await prisma.part.findUnique({
    where: { id },
    include: { family: true, images: { orderBy: { createdAt: "asc" } } },
  });

  if (!part) notFound();

  const marginPercent = part.costCents > 0
    ? Math.max(0, ((part.priceCents / 1.21) / part.costCents - 1) * 100)
    : null;

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              {part.family.name}
            </span>
            {part.reference ? <p className="font-mono text-sm font-semibold text-slate-500">Ref. {part.reference}</p> : null}
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              {part.description}
            </h1>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-amber-50 px-4 py-3 dark:bg-amber-950/30">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Coste sin IVA</p>
                <p className="mt-1 text-xl font-bold text-amber-900 dark:text-amber-100">{formatPrice(part.costCents)}</p>
              </div>
              <div className="rounded-xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recargo</p>
                <p className="mt-1 text-xl font-bold">{marginPercent === null ? "Sin calcular" : `${marginPercent.toFixed(2).replace(".", ",")}%`}</p>
              </div>
              <div className="rounded-xl bg-blue-50 px-4 py-3 dark:bg-blue-950/30">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">PVP IVA incluido</p>
                <p className="mt-1 text-xl font-bold text-blue-700 dark:text-blue-300">{formatPrice(part.priceCents)}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link
              href={`/catalogo/${part.id}/editar`}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
            >
              Editar
            </Link>
            <Link
              href="/catalogo"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors dark:border-slate-700 dark:bg-slate-900"
            >
              Volver
            </Link>
          </div>
        </div>
      </div>

      {/* Fotos */}
      {part.images.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
          Esta pieza no tiene imágenes todavía.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {part.images.map((img) => (
            <div
              key={img.id}
              className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm dark:border-slate-800 dark:bg-slate-800"
            >
              <Image
                src={getPrivateImageUrl(img.id)}
                alt={part.description}
                fill
                unoptimized
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 50vw"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
