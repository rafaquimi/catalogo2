"use client";

import { useState, useTransition } from "react";
import { deleteFamily, updateFamily } from "./actions";

interface Props {
  family: { id: string; name: string; partCount: number };
}

export function FamilyRow({ family }: Props) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function remove() {
    const detail = family.partCount === 0
      ? "Esta familia se eliminará definitivamente."
      : `Las ${family.partCount} piezas de esta familia se conservarán como \"Sin familia\".`;
    if (!window.confirm(`¿Eliminar la familia \"${family.name}\"?\n\n${detail}`)) return;
    startTransition(() => void deleteFamily(family.id));
  }

  if (editing) {
    return (
      <form
        action={(formData) => startTransition(async () => {
          await updateFamily(family.id, formData);
          setEditing(false);
        })}
        className="grid gap-3 border-b border-slate-100 px-4 py-4 last:border-b-0 dark:border-slate-800 sm:grid-cols-[minmax(0,1fr)_6rem_auto] sm:items-center"
      >
        <input name="name" required maxLength={100} defaultValue={family.name} autoFocus className="rounded-xl border border-blue-300 bg-white px-3 py-2 text-sm outline-none focus:ring-3 focus:ring-blue-500/20 dark:border-blue-700 dark:bg-slate-800" />
        <div className="text-sm text-slate-500 sm:text-center">{family.partCount} piezas</div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setEditing(false)} disabled={pending} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800">Cancelar</button>
          <button disabled={pending} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{pending ? "Guardando…" : "Guardar"}</button>
        </div>
      </form>
    );
  }

  return (
    <div className="grid gap-3 border-b border-slate-100 px-4 py-4 last:border-b-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40 sm:grid-cols-[minmax(0,1fr)_6rem_auto] sm:items-center">
      <div className="min-w-0 font-medium text-slate-800 dark:text-slate-100">{family.name}</div>
      <div className="sm:text-center">
        <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{family.partCount} {family.partCount === 1 ? "pieza" : "piezas"}</span>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setEditing(true)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:text-slate-200">Editar</button>
        <button type="button" onClick={remove} disabled={pending} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/60 dark:hover:bg-red-950/30">{pending ? "Eliminando…" : "Eliminar"}</button>
      </div>
    </div>
  );
}
