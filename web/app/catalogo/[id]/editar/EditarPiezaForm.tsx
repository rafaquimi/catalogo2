"use client";

import { useRef, useState, useTransition } from "react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import Image from "next/image";
import { updatePart, deletePart, deleteImage } from "./actions";

interface ExistingImage {
  id: string;
  url: string;
}

interface Props {
  part: {
    id: string;
    description: string;
    priceCents: number;
    familyId: string;
    images: ExistingImage[];
  };
  families: { id: string; name: string }[];
}

interface NewImage {
  file: File;
  preview: string;
}

export function EditarPiezaForm({ part, families }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newImages, setNewImages] = useState<NewImage[]>([]);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setNewImages((prev) => [...prev, { file, preview }]);
    e.target.value = "";
  }

  function removeNewImage(index: number) {
    setNewImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleDeleteImage(imageId: string) {
    setDeletingImageId(imageId);
    try {
      await deleteImage(imageId, part.id);
    } catch (err) {
      if (!isRedirectError(err)) {
        setError("Error al eliminar la foto.");
      }
    } finally {
      setDeletingImageId(null);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.delete("images");
    newImages.forEach(({ file }) => formData.append("images", file));

    startTransition(async () => {
      try {
        await updatePart(part.id, formData);
      } catch (err) {
        if (isRedirectError(err)) throw err;
        setError(err instanceof Error ? err.message : "Error al guardar.");
      }
    });
  }

  async function handleDeletePart() {
    if (!confirm("¿Eliminar esta pieza y todas sus fotos? Esta acción no se puede deshacer.")) return;
    setIsDeleting(true);
    try {
      await deletePart(part.id);
    } catch (err) {
      if (isRedirectError(err)) throw err;
      setError("Error al eliminar la pieza.");
      setIsDeleting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-950">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-2">
            <label className="text-sm font-medium">Descripción</label>
            <textarea
              name="description"
              required
              rows={3}
              defaultValue={part.description}
              className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10 dark:border-white/10 dark:bg-zinc-950"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Familia</label>
            <select
              name="familyId"
              required
              defaultValue={part.familyId}
              className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10 dark:border-white/10 dark:bg-zinc-950"
            >
              {families.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Precio (EUR)</label>
            <input
              name="price"
              required
              inputMode="decimal"
              defaultValue={(part.priceCents / 100).toFixed(2).replace(".", ",")}
              className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10 dark:border-white/10 dark:bg-zinc-950"
            />
          </div>
        </div>
      </div>

      {/* Fotos existentes */}
      <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-950 space-y-4">
        <h2 className="text-sm font-medium">Fotos actuales</h2>

        {part.images.length === 0 ? (
          <p className="text-sm text-zinc-500">No hay fotos todavía.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {part.images.map((img) => (
              <div
                key={img.id}
                className="relative h-24 w-24 overflow-hidden rounded-xl border border-black/10 dark:border-white/10"
              >
                <Image
                  src={img.url}
                  alt="Foto de la pieza"
                  fill
                  className="object-cover"
                  sizes="96px"
                />
                <button
                  type="button"
                  onClick={() => handleDeleteImage(img.id)}
                  disabled={deletingImageId === img.id}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white text-xs hover:bg-red-700 disabled:opacity-50"
                  title="Eliminar foto"
                >
                  {deletingImageId === img.id ? "…" : "×"}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Nuevas fotos a añadir */}
        {newImages.length > 0 && (
          <>
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Fotos nuevas a añadir</h3>
            <div className="flex flex-wrap gap-3">
              {newImages.map((img, i) => (
                <div
                  key={i}
                  className="relative h-24 w-24 overflow-hidden rounded-xl border-2 border-dashed border-black/20 dark:border-white/20"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.preview} alt={`Nueva foto ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeNewImage(i)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white text-xs hover:bg-black"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 rounded-xl border border-dashed border-black/20 bg-white px-4 py-3 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-white/20 dark:bg-zinc-950 dark:text-zinc-400"
        >
          <span className="text-lg leading-none">+</span>
          Añadir foto
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,image/heic,image/heif"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Botones */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleDeletePart}
          disabled={isDeleting}
          className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-500/10 disabled:opacity-50 dark:text-red-400"
        >
          {isDeleting ? "Eliminando…" : "Eliminar pieza"}
        </button>

        <div className="flex gap-3">
          <a
            href={`/catalogo/${part.id}`}
            className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950"
          >
            Cancelar
          </a>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-black px-4 py-3 text-sm font-medium text-white hover:bg-black/90 disabled:opacity-60"
          >
            {isPending ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </form>
  );
}
