"use client";

import { useMemo, useState, useTransition } from "react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { createQuote } from "../actions";
import { formatMoney } from "@/lib/quote-calculations";

interface Part { id: string; description: string; priceCents: number; family: string }
interface Customer { id: string; name: string; phone: string; email: string | null }
interface Line extends Part { quantity: number; discountBps: number }

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900";

export function QuoteBuilder({ parts, customers, validityDays, initialPartId }: { parts: Part[]; customers: Customer[]; validityDays: number; initialPartId?: string }) {
  const [query, setQuery] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [lines, setLines] = useState<Line[]>(() => {
    const part = parts.find(p => p.id === initialPartId);
    return part ? [{ ...part, quantity: 1, discountBps: 0 }] : [];
  });
  const [notes, setNotes] = useState("");
  const [days, setDays] = useState(validityDays);
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
    setLines(current => current.some(line => line.id === part.id) ? current.map(line => line.id === part.id ? { ...line, quantity: line.quantity + 1 } : line) : [...current, { ...part, quantity: 1, discountBps: 0 }]);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await createQuote({
          customerId: customerId || undefined, customerName: name, customerPhone: phone, customerEmail: email,
          validityDays: days, notes,
          items: lines.map(line => ({ partId: line.id, description: line.description, quantity: line.quantity, unitPriceCents: line.priceCents, discountBps: line.discountBps })),
        });
        if (!result.ok) setError(result.error || "No se ha podido guardar.");
      } catch (err) { if (isRedirectError(err)) throw err; setError("No se ha podido guardar el presupuesto."); }
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
        <div className="mb-5 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-50 font-bold text-cyan-700 dark:bg-cyan-950">2</span><div><h2 className="font-semibold">Piezas</h2><p className="text-xs text-slate-500">Busca y añade las piezas del presupuesto</p></div></div>
        <input value={query} onChange={e => setQuery(e.target.value)} className={inputClass} placeholder="Buscar por nombre o familia…"/>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">{filtered.map(part => <button key={part.id} type="button" onClick={() => addPart(part)} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-blue-300 hover:bg-blue-50/60 dark:border-slate-700 dark:hover:bg-blue-950/20"><span><span className="block text-sm font-medium">{part.description}</span><span className="text-xs text-slate-500">{part.family}</span></span><span className="shrink-0 text-sm font-bold text-blue-700 dark:text-cyan-300">{formatMoney(part.priceCents)} +</span></button>)}</div>
        <div className="mt-5 space-y-3">{lines.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-400 dark:border-slate-700">Todavía no has añadido ninguna pieza.</div> : lines.map((line, index) => <div key={line.id} className="grid gap-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-950 sm:grid-cols-[1fr_90px_130px_90px_36px] sm:items-end"><div><span className="text-xs text-slate-400">Pieza</span><p className="text-sm font-medium">{line.description}</p></div><div><label className="text-xs text-slate-500">Cantidad</label><input type="number" min="1" value={line.quantity} onChange={e => setLines(v => v.map((x,i) => i === index ? {...x,quantity:Number(e.target.value)} : x))} className={inputClass}/></div><div><label className="text-xs text-slate-500">Precio IVA incl.</label><input inputMode="decimal" value={(line.priceCents/100).toFixed(2).replace(".",",")} onChange={e => { const cents=Math.round(Number(e.target.value.replace(",","."))*100); if(Number.isFinite(cents)) setLines(v => v.map((x,i)=>i===index?{...x,priceCents:cents}:x)); }} className={inputClass}/></div><div><label className="text-xs text-slate-500">Dto. %</label><input type="number" min="0" max="100" value={line.discountBps/100} onChange={e => setLines(v => v.map((x,i)=>i===index?{...x,discountBps:Math.round(Number(e.target.value)*100)}:x))} className={inputClass}/></div><button type="button" onClick={() => setLines(v => v.filter((_,i)=>i!==index))} className="grid h-10 w-10 place-items-center rounded-lg text-xl text-red-500 hover:bg-red-50">×</button></div>)}</div>
      </section>
    </div>

    <aside className="space-y-4 xl:sticky xl:top-8 xl:self-start">
      <section className="rounded-2xl bg-slate-950 p-6 text-white shadow-xl shadow-slate-300/30 dark:shadow-none"><p className="text-xs font-semibold uppercase tracking-[.18em] text-cyan-300">Resumen</p><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between text-slate-400"><span>Base imponible</span><span>{formatMoney(taxBase)}</span></div><div className="flex justify-between text-slate-400"><span>IVA incluido (21%)</span><span>{formatMoney(total-taxBase)}</span></div><div className="border-t border-white/10 pt-4"><div className="flex items-end justify-between"><span className="font-medium">Total</span><span className="text-3xl font-bold tracking-tight text-cyan-300">{formatMoney(total)}</span></div></div></div></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><label className="mb-1.5 block text-sm font-medium">Validez (días)</label><input type="number" min="1" max="365" value={days} onChange={e=>setDays(Number(e.target.value))} className={inputClass}/><label className="mb-1.5 mt-4 block text-sm font-medium">Notas</label><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={4} className={inputClass} placeholder="Condiciones, plazo de entrega…"/></section>
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      <button type="button" onClick={submit} disabled={pending || !name || !phone || lines.length===0} className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">{pending ? "Creando…" : "Crear presupuesto"}</button>
    </aside>
  </div>;
}
