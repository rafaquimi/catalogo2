"use client";

import { useMemo, useState } from "react";
import { CatalogCard } from "./CatalogCard";

interface Part {
  id: string;
  reference: string | null;
  description: string;
  family: string;
  familyId: string | null;
  costCents: number;
  cost: string;
  priceCents: number;
  price: string;
  images: { id: string; url: string }[];
}

interface Props {
  parts: Part[];
  families: { id: string; name: string }[];
}

type SortOrder = "none" | "asc" | "desc";

export function CatalogClient({ parts, families }: Props) {
  const [query, setQuery] = useState("");
  const [familyId, setFamilyId] = useState("all");
  const [sort, setSort] = useState<SortOrder>("none");
  const [showCost, setShowCost] = useState(false);

  const filtered = useMemo(() => {
    let result = parts;

    if (familyId === "orphan") {
      result = result.filter((p) => p.familyId === null);
    } else if (familyId !== "all") {
      result = result.filter((p) => p.familyId === familyId);
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter((p) => `${p.reference ?? ""} ${p.description}`.toLowerCase().includes(q));
    }

    if (sort === "asc") {
      result = [...result].sort((a, b) => (showCost ? a.costCents - b.costCents : a.priceCents - b.priceCents));
    } else if (sort === "desc") {
      result = [...result].sort((a, b) => (showCost ? b.costCents - a.costCents : b.priceCents - a.priceCents));
    }

    return result;
  }, [parts, query, familyId, sort, showCost]);

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-3 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900";

  return (
    <div className="space-y-5">
      {/* Barra de filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Búsqueda */}
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </span>
          <input
            type="search"
            placeholder="Buscar pieza…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`${inputClass} pl-9`}
          />
        </div>

        {/* Familia */}
        <select
          value={familyId}
          onChange={(e) => setFamilyId(e.target.value)}
          className={`${inputClass} sm:w-52`}
        >
          <option value="all">Todas las familias</option>
          {families.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
          {parts.some((part) => part.familyId === null) ? <option value="orphan">Sin familia</option> : null}
        </select>

        <label className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition sm:min-w-52 ${showCost ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200" : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"}`}>
          <span>{showCost ? "Coste + PVP" : "Solo PVP"}</span>
          <span className={`relative h-6 w-11 rounded-full transition ${showCost ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"}`}>
            <input type="checkbox" checked={showCost} onChange={event => setShowCost(event.target.checked)} className="sr-only" aria-label="Mostrar también el precio de coste" />
            <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${showCost ? "left-6" : "left-1"}`} />
          </span>
        </label>

        {/* Ordenar por precio */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOrder)}
          className={`${inputClass} sm:w-52`}
        >
          <option value="none">Ordenar por…</option>
          <option value="asc">Precio: menor a mayor</option>
          <option value="desc">Precio: mayor a menor</option>
        </select>
      </div>

      {/* Resultados */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          {parts.length === 0
            ? "No hay piezas todavía."
            : "No hay resultados para esa búsqueda."}
        </div>
      ) : (
        <>
          <p className="text-xs text-slate-400">
            {filtered.length} {filtered.length === 1 ? "pieza encontrada" : "piezas encontradas"}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <CatalogCard
                key={p.id}
                id={p.id}
                reference={p.reference}
                description={p.description}
                family={p.family}
                cost={p.cost}
                pvp={p.price}
                showCost={showCost}
                images={p.images}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
