"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface Props {
  id: string;
  description: string;
  family: string;
  price: string;
  images: { id: string; url: string }[];
}

export function CatalogCard({ id, description, family, price, images }: Props) {
  const [current, setCurrent] = useState(0);

  function prev(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setCurrent((c) => (c - 1 + images.length) % images.length);
  }

  function next(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setCurrent((c) => (c + 1) % images.length);
  }

  const cover = images[current]?.url ?? null;

  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm hover:shadow-md dark:border-white/10 dark:bg-zinc-950">
      {/* Zona de imagen con flechas */}
      <div className="relative aspect-[4/3] w-full bg-zinc-100 dark:bg-zinc-900">
        <Link href={`/catalogo/${id}`} className="block h-full w-full">
          {cover ? (
            <Image
              src={cover}
              alt={description}
              fill
              className="object-cover transition-transform duration-300 hover:scale-[1.02]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
              Sin imagen
            </div>
          )}
        </Link>

        {/* Flechas de navegación (solo si hay más de 1 foto) */}
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              aria-label="Foto anterior"
            >
              ‹
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              aria-label="Foto siguiente"
            >
              ›
            </button>

            {/* Contador */}
            <div className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white">
              {current + 1} / {images.length}
            </div>

            {/* Puntos indicadores */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrent(i); }}
                  className={`h-1.5 rounded-full transition-all ${
                    i === current ? "w-4 bg-white" : "w-1.5 bg-white/50"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Info: también es enlace al detalle */}
      <Link href={`/catalogo/${id}`} className="block space-y-1 p-4">
        <div className="text-xs text-zinc-500">{family}</div>
        <div className="text-sm font-medium">{description}</div>
        <div className="text-sm">{price}</div>
      </Link>
    </div>
  );
}
