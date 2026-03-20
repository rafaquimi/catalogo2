"use client";

import { useRef, useState, useTransition } from "react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { createPart } from "./actions";

interface Props {
  families: { id: string; name: string }[];
}

interface ImageEntry {
  file: File;
  preview: string;
}

export function NuevaPiezaForm({ families }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setImages((prev) => [...prev, { file, preview }]);
    e.target.value = "";
  }

  function removeImage(index: number) {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.delete("images");
    images.forEach(({ file }) => formData.append("images", file));

    startTransition(async () => {
      try {
        await createPart(formData);
      } catch (err) {
        if (isRedirectError(err)) throw err; // dejar que Next.js gestione el redirect
        setError(err instanceof Error ? err.message : "Error al guardar la pieza.");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
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
            defaultValue={families[0]?.id ?? ""}
            className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10 dark:border-white/10 dark:bg-zinc-950"
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

        {/* Selector de imágenes */}
        <div className="sm:col-span-2 space-y-3">
          <label className="text-sm font-medium">Imágenes</label>

          {/* Miniaturas de imágenes seleccionadas */}
          {images.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {images.map((img, i) => (
                <div
                  key={i}
                  className="relative h-24 w-24 overflow-hidden rounded-xl border border-black/10 dark:border-white/10"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.preview}
                    alt={`Foto ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white text-xs hover:bg-black"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Botón añadir foto */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-xl border border-dashed border-black/20 bg-white px-4 py-3 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-white/20 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900"
          >
            <span className="text-lg leading-none">+</span>
            {images.length === 0 ? "Añadir foto" : "Añadir otra foto"}
          </button>

          {/* Input oculto */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,image/heic,image/heif"
            onChange={handleFileChange}
            className="hidden"
          />

          <p className="text-xs text-zinc-500">
            Pulsa el botón para añadir fotos una a una. En móvil podrás usar la cámara o la galería.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="mt-6 flex items-center justify-end gap-3">
        <a
          href="/catalogo"
          className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-zinc-900"
        >
          Cancelar
        </a>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-black px-4 py-3 text-sm font-medium text-white hover:bg-black/90 disabled:opacity-60"
        >
          {isPending ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  );
}
