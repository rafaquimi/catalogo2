"use client";

import { useState } from "react";
import Image from "next/image";

interface Props {
  images: { id: string; url: string }[];
  alt: string;
}

export function ImageViewer({ images, alt }: Props) {
  const [current, setCurrent] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  if (images.length === 0) return null;

  const prev = () => setCurrent((c) => (c - 1 + images.length) % images.length);
  const next = () => setCurrent((c) => (c + 1) % images.length);

  return (
    <>
      {/* Imagen principal con flechas */}
      <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-zinc-100 dark:border-white/10 dark:bg-zinc-900">
        <div
          className="relative aspect-[4/3] w-full cursor-pointer"
          onClick={() => setLightbox(true)}
        >
          <Image
            src={images[current].url}
            alt={`${alt} - foto ${current + 1}`}
            fill
            className="object-cover transition-opacity duration-300"
            sizes="(max-width: 768px) 100vw, 800px"
            priority
          />
          {/* Overlay semitransparente para indicar que es clickable */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/10">
            <span className="rounded-full bg-black/50 px-3 py-1 text-xs text-white">Ver completa</span>
          </div>
        </div>

        {/* Flechas de navegación */}
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors"
              aria-label="Foto anterior"
            >
              ‹
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors"
              aria-label="Foto siguiente"
            >
              ›
            </button>
            {/* Contador */}
            <div className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white">
              {current + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      {/* Miniaturas */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setCurrent(i)}
              className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border-2 transition-colors ${
                i === current
                  ? "border-black dark:border-white"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <Image
                src={img.url}
                alt={`Miniatura ${i + 1}`}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox pantalla completa */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setLightbox(false)}
        >
          <button
            className="absolute right-4 top-4 text-white text-3xl leading-none hover:text-zinc-300"
            onClick={() => setLightbox(false)}
          >
            ×
          </button>
          {images.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-5xl leading-none hover:text-zinc-300"
                onClick={(e) => { e.stopPropagation(); prev(); }}
              >
                ‹
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-5xl leading-none hover:text-zinc-300"
                onClick={(e) => { e.stopPropagation(); next(); }}
              >
                ›
              </button>
            </>
          )}
          <div className="relative max-h-[90vh] max-w-[90vw] w-full h-full" onClick={(e) => e.stopPropagation()}>
            <Image
              src={images[current].url}
              alt={`${alt} - foto ${current + 1}`}
              fill
              className="object-contain"
              sizes="90vw"
            />
          </div>
          <div className="absolute bottom-4 text-white text-sm opacity-70">
            {current + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  );
}
