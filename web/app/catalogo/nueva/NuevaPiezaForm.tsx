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

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-3 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800";

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
        if (isRedirectError(err)) throw err;
        setError(err instanceof Error ? err.message : "Error al guardar la pieza.");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-1.5">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Descripción</label>
          <textarea
            name="description"
            required
            rows={3}
            className={inputClass}
            placeholder="Describe la pieza…"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Familia</label>
          <select
            name="familyId"
            required
            defaultValue={families[0]?.id ?? ""}
            className={inputClass}
          >
            {families.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Precio (EUR)</label>
          <input
            name="price"
            required
            inputMode="decimal"
            placeholder="Ej: 12,50"
            className={inputClass}
          />
        </div>

        {/* Fotos */}
        <div className="sm:col-span-2 space-y-3">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Fotos</label>

          {images.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {images.map((img, i) => (
                <div
                  key={i}
                  className="relative h-24 w-24 overflow-hidden rounded-xl border-2 border-blue-200 shadow-sm"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.preview} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white text-xs hover:bg-red-700"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 hover:border-blue-400 hover:bg-blue-100 transition-colors dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
          >
            <span className="text-lg leading-none">+</span>
            {images.length === 0 ? "Añadir foto" : "Añadir otra foto"}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,image/heic,image/heif"
            onChange={handleFileChange}
            className="hidden"
          />

          <p className="text-xs text-slate-400">
            Pulsa el botón para añadir fotos una a una. En móvil podrás usar la cámara o la galería.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 flex items-center justify-end gap-3">
        <a
          href="/catalogo"
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 transition-colors dark:border-slate-700 dark:bg-slate-900"
        >
          Cancelar
        </a>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 transition-colors"
        >
          {isPending ? "Guardando…" : "Guardar pieza"}
        </button>
      </div>
    </form>
  );
}
