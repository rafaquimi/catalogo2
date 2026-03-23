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
    <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200 dark:border-slate-800 dark:bg-slate-900">
      {/* Imagen con flechas */}
      <div className="relative aspect-[4/3] w-full bg-slate-100 dark:bg-slate-800">
        <Link href={`/catalogo/${id}`} className="block h-full w-full">
          {cover ? (
            <Image
              src={cover}
              alt={description}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
              Sin imagen
            </div>
          )}
        </Link>

        {/* Flechas de navegación */}
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-blue-700/80 text-white text-lg hover:bg-blue-700 transition-colors shadow"
              aria-label="Foto anterior"
            >
              ‹
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-blue-700/80 text-white text-lg hover:bg-blue-700 transition-colors shadow"
              aria-label="Foto siguiente"
            >
              ›
            </button>

            {/* Contador */}
            <div className="absolute bottom-2 right-2 rounded-full bg-blue-900/70 px-2 py-0.5 text-xs text-white">
              {current + 1} / {images.length}
            </div>

            {/* Puntos */}
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

      {/* Info */}
      <Link href={`/catalogo/${id}`} className="block p-4 space-y-1">
        <span className="inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          {family}
        </span>
        <div className="text-sm font-medium text-slate-800 dark:text-slate-100 line-clamp-2">{description}</div>
        <div className="text-base font-bold text-blue-700 dark:text-blue-400">{price}</div>
      </Link>
    </div>
  );
}
