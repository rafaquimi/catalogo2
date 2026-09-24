"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { createQuote, updateQuote } from "../actions";
import { formatMoney } from "@/lib/quote-calculations";
import { useQuoteDraft } from "../../QuoteDraftContext";

interface Part { id: string; description: string; priceCents: number; family: string; imageUrl: string | null }
interface Customer { id: string; name: string; phone: string; email: string | null }
interface Line extends Part { partId: string | null; quantity: number; discountBps: number }
export interface InitialQuote {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  validityDays: number;
  notes: string | null;
  items: Array<{ id: string; partId: string | null; description: string; quantity: number; unitPriceCents: number; discountBps: number }>;
}

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900";

export function QuoteBuilder({ parts, customers, validityDays, initialPartId, initialQuote }: { parts: Part[]; customers: Customer[]; validityDays: number; initialPartId?: string; initialQuote?: InitialQuote }) {
  const router = useRouter();
  const draft = useQuoteDraft();
  const [query, setQuery] = useState("");
  const [customerId, setCustomerId] = useState(initialQuote?.customerId || "");
  const [name, setName] = useState(initialQuote?.customerName || "");
  const [phone, setPhone] = useState(initialQuote?.customerPhone || "");
  const [email, setEmail] = useState(initialQuote?.customerEmail || "");
  const [lines, setLines] = useState<Line[]>(() => {
    if (initialQuote) return initialQuote.items.map(item => {
      const part = parts.find(candidate => candidate.id === item.partId);
      return { id: part?.id || `quote-item-${item.id}`, partId: item.partId, description: item.description, priceCents: item.unitPriceCents, family: part?.family || "Pieza histórica", imageUrl: part?.imageUrl || null, quantity: item.quantity, discountBps: item.discountBps };
    });
    const selected = parts.filter(part => (draft.quantities[part.id] || 0) > 0).map(part => ({ ...part, partId: part.id, quantity: draft.quantities[part.id], discountBps: 0 }));
    const initial = parts.find(part => part.id === initialPartId);
    if (initial && !selected.some(line => line.id === initial.id)) selected.push({ ...initial, partId: initial.id, quantity: 1, discountBps: 0 });
    return selected;
  });
  const [notes, setNotes] = useState(initialQuote?.notes || "");
  const [days, setDays] = useState(initialQuote?.validityDays || validityDays);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => parts.filter(p => `${p.description} ${p.family}`.toLowerCase().includes(query.toLowerCase())).slice(0, 8), [parts, query]);
  const total = lines.reduce((sum, line) => sum + Math.round(line.quantity * line.priceCents * (10_000 - line.discountBps) / 10_000), 0);
  const taxBase = Math.round(total / 1.21);

  function chooseCustomer(id: string) {
    setCustomerId(id);
    const customer = customers.find(c => c.id === id);
    if (customer) { setName(customer.name); setPhone(customer.phone); setEmail(customer.email || ""); }
  }

  function addPart(part: Part) {
    const nextQuantity = (lines.find(line => line.partId === part.id)?.quantity || 0) + 1;
    setLines(current => current.some(line => line.partId === part.id) ? current.map(line => line.partId === part.id ? { ...line, quantity: nextQuantity } : line) : [...current, { ...part, partId: part.id, quantity: 1, discountBps: 0 }]);
    if (!initialQuote) draft.setQuantity(part.id, nextQuantity);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const payload = {
          customerId: customerId || undefined, customerName: name, customerPhone: phone, customerEmail: email,
          validityDays: days, notes,
          items: lines.map(line => ({ partId: line.partId, description: line.description, quantity: line.quantity, unitPriceCents: line.priceCents, discountBps: line.discountBps })),
        };
        const result = initialQuote ? await updateQuote(initialQuote.id, payload) : await createQuote(payload);
        if (!result.ok || !result.quoteId) { setError(result.error || "No se ha podido guardar."); return; }
        if (!initialQuote) draft.clearDraft();
        router.push(`/catalogo/presupuestos/${result.quoteId}`);
        router.refresh();
      } catch { setError("No se ha podido guardar el presupuesto."); }
    });
  }

  return <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="mb-5 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 font-bold text-blue-700 dark:bg-blue-950">1</span><div><h2 className="font-semibold">Cliente</h2><p className="text-xs text-slate-500">Nombre y teléfono son obligatorios</p></div></div>
        {customers.length ? <div className="mb-4"><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Usar cliente anterior</label><select value={customerId} onChange={e => chooseCustomer(e.target.value)} className={inputClass}><option value="">Cliente nuevo</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}</select></div> : null}
        <div className="grid gap-4 sm:grid-cols-2"><div><label className="mb-1.5 block text-sm font-medium">Nombre</label><input value={name} onChange={e => setName(e.target.value)} className={inputClass} placeholder="Nombre del cliente"/></div><div><label className="mb-1.5 block text-sm font-medium">Teléfono</label><input value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} inputMode="tel" placeholder="600 000 000"/></div><div className="sm:col-span-2"><label className="mb-1.5 block text-sm font-medium">Email <span className="font-normal text-slate-400">(opcional)</span></label><input value={email} onChange={e => setEmail(e.target.value)} className={inputClass} type="email" placeholder="cliente@correo.es"/></div></div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="mb-5 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-50 font-bold text-cyan-700 dark:bg-cyan-950">2</span><div className="min-w-0 flex-1"><h2 className="font-semibold">Piezas</h2><p className="text-xs text-slate-500">Busca y añade las piezas del presupuesto</p></div>{lines.length > 0 ? <button type="button" onClick={() => { setLines([]); if (!initialQuote) draft.clearDraft(); }} className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30">Vaciar selección</button> : null}</div>
        <input value={query} onChange={e => setQuery(e.target.value)} className={inputClass} placeholder="Buscar por nombre o familia…"/>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">{filtered.map(part => <button key={part.id} type="button" onClick={() => addPart(part)} className="flex items-center gap-3 overflow-hidden rounded-xl border border-slate-200 p-2 text-left transition hover:border-blue-300 hover:bg-blue-50/60 dark:border-slate-700 dark:hover:bg-blue-950/20"><span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">{part.imageUrl ? <Image src={part.imageUrl} alt={part.description} fill unoptimized className="object-cover" sizes="64px" /> : <span className="grid h-full place-items-center text-[10px] text-slate-400">Sin foto</span>}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{part.description}</span><span className="block text-xs text-slate-500">{part.family}</span><span className="mt-1 block text-sm font-bold text-blue-700 dark:text-cyan-300">{formatMoney(part.priceCents)}</span></span><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-950 font-bold text-white dark:bg-cyan-400 dark:text-slate-950">+</span></button>)}</div>
        <div className="mt-5 space-y-3">{lines.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-400 dark:border-slate-700">Todavía no has añadido ninguna pieza.</div> : lines.map((line, index) => <div key={line.id} className="grid gap-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-950 sm:grid-cols-[56px_1fr_90px_130px_90px_36px] sm:items-end"><div className="relative hidden h-14 w-14 overflow-hidden rounded-lg bg-slate-200 sm:block">{line.imageUrl?<Image src={line.imageUrl} alt={line.description} fill unoptimized className="object-cover" sizes="56px"/>:null}</div><div><span className="text-xs text-slate-400">Pieza</span><p className="text-sm font-medium">{line.description}</p></div><div><label className="text-xs text-slate-500">Cantidad</label><input type="number" min="1" value={line.quantity} onChange={e => { const quantity=Math.max(1,Number(e.target.value)); setLines(v => v.map((x,i) => i === index ? {...x,quantity} : x)); if (!initialQuote && line.partId) draft.setQuantity(line.partId,quantity); }} className={inputClass}/></div><div><label className="text-xs text-slate-500">Precio IVA incl.</label><input inputMode="decimal" value={(line.priceCents/100).toFixed(2).replace(".",",")} onChange={e => { const cents=Math.round(Number(e.target.value.replace(",","."))*100); if(Number.isFinite(cents)) setLines(v => v.map((x,i)=>i===index?{...x,priceCents:cents}:x)); }} className={inputClass}/></div><div><label className="text-xs text-slate-500">Dto. %</label><input type="number" min="0" max="100" value={line.discountBps/100} onChange={e => setLines(v => v.map((x,i)=>i===index?{...x,discountBps:Math.round(Number(e.target.value)*100)}:x))} className={inputClass}/></div><button type="button" onClick={() => { setLines(v => v.filter((_,i)=>i!==index)); if (!initialQuote && line.partId) draft.removePart(line.partId); }} className="grid h-10 w-10 place-items-center rounded-lg text-xl text-red-500 hover:bg-red-50">×</button></div>)}</div>
      </section>
    </div>

    <aside className="space-y-4 xl:sticky xl:top-8 xl:self-start">
      <section className="rounded-2xl bg-slate-950 p-6 text-white shadow-xl shadow-slate-300/30 dark:shadow-none"><p className="text-xs font-semibold uppercase tracking-[.18em] text-cyan-300">Resumen</p><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between text-slate-400"><span>Base imponible</span><span>{formatMoney(taxBase)}</span></div><div className="flex justify-between text-slate-400"><span>IVA incluido (21%)</span><span>{formatMoney(total-taxBase)}</span></div><div className="border-t border-white/10 pt-4"><div className="flex items-end justify-between"><span className="font-medium">Total</span><span className="text-3xl font-bold tracking-tight text-cyan-300">{formatMoney(total)}</span></div></div></div></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><label className="mb-1.5 block text-sm font-medium">Validez (días)</label><input type="number" min="1" max="365" value={days} onChange={e=>setDays(Number(e.target.value))} className={inputClass}/><label className="mb-1.5 mt-4 block text-sm font-medium">Notas</label><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={4} className={inputClass} placeholder="Condiciones, plazo de entrega…"/></section>
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      <button type="button" onClick={submit} disabled={pending || !name || !phone || lines.length===0} className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">{pending ? (initialQuote ? "Guardando…" : "Creando…") : (initialQuote ? "Guardar cambios" : "Crear presupuesto")}</button>
    </aside>
  </div>;
}
