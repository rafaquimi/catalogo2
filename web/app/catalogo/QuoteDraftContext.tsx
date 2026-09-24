"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

interface DraftContextValue {
  quantities: Record<string, number>;
  ready: boolean;
  itemCount: number;
  addPart: (partId: string) => void;
  setQuantity: (partId: string, quantity: number) => void;
  removePart: (partId: string) => void;
  clearDraft: () => void;
}

const QuoteDraftContext = createContext<DraftContextValue | null>(null);
const STORAGE_KEY = "catalogo2-quote-draft-v1";

export function QuoteDraftProvider({ children }: { children: React.ReactNode }) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setQuantities(JSON.parse(stored));
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (ready) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(quantities));
  }, [quantities, ready]);

  const value = useMemo<DraftContextValue>(() => ({
    quantities,
    ready,
    itemCount: Object.values(quantities).reduce((sum, quantity) => sum + quantity, 0),
    addPart: partId => setQuantities(current => ({ ...current, [partId]: (current[partId] || 0) + 1 })),
    setQuantity: (partId, quantity) => setQuantities(current => quantity > 0 ? { ...current, [partId]: quantity } : Object.fromEntries(Object.entries(current).filter(([id]) => id !== partId))),
    removePart: partId => setQuantities(current => Object.fromEntries(Object.entries(current).filter(([id]) => id !== partId))),
    clearDraft: () => setQuantities({}),
  }), [quantities, ready]);

  return <QuoteDraftContext.Provider value={value}>{ready ? children : <div className="grid min-h-screen place-items-center bg-slate-50 text-sm text-slate-500 dark:bg-slate-950">Cargando catálogo…</div>}{ready ? <DraftSummary /> : null}</QuoteDraftContext.Provider>;
}

export function useQuoteDraft() {
  const context = useContext(QuoteDraftContext);
  if (!context) throw new Error("useQuoteDraft debe usarse dentro de QuoteDraftProvider");
  return context;
}

function DraftSummary() {
  const { itemCount, ready } = useQuoteDraft();
  const pathname = usePathname();
  if (!ready || itemCount === 0 || pathname === "/catalogo/presupuestos/nuevo") return null;
  return <div className="fixed bottom-20 right-4 z-30 rounded-2xl border border-cyan-300/30 bg-slate-950 p-2 text-white shadow-2xl shadow-slate-950/30 lg:bottom-6 lg:right-7">
    <Link href="/catalogo/presupuestos/nuevo" className="flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-white/10">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-400 text-sm font-black text-slate-950">{itemCount}</span>
      <span className="pr-2"><span className="block text-sm font-semibold">Presupuesto en curso</span><span className="block text-xs text-slate-400">Abrir y completar →</span></span>
    </Link>
  </div>;
}
