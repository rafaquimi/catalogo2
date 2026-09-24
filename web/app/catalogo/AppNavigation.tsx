"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { useQuoteDraft } from "./QuoteDraftContext";

type IconName = "catalog" | "quotes" | "plus" | "family" | "activity" | "settings" | "account" | "menu" | "logout";

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    catalog: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 5.5v15A2.5 2.5 0 0 1 6.5 18H20"/></>,
    quotes: <><path d="M6 3h12a2 2 0 0 1 2 2v16l-4-2-4 2-4-2-4 2V5a2 2 0 0 1 2-2z"/><path d="M8 8h8M8 12h6"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    family: <><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 4.5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5"/></>,
    activity: <><path d="M4 19V5M4 19h16"/><path d="m7 15 4-4 3 2 5-6"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.5 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.1A1.7 1.7 0 0 0 4.6 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.5 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.38.3.6.66.6 1.1v.5h1v4h-.1A1.7 1.7 0 0 0 19.4 15z"/></>,
    account: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3"/><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/></>,
  };
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{paths[name]}</svg>;
}

const primary = [
  { href: "/catalogo", label: "Catálogo", icon: "catalog" as const, exact: true },
  { href: "/catalogo/presupuestos", label: "Presupuestos", icon: "quotes" as const },
];

const management = [
  { href: "/catalogo/nueva", label: "Nueva pieza", icon: "plus" as const },
  { href: "/catalogo/familias", label: "Familias", icon: "family" as const },
  { href: "/catalogo/actividad", label: "Actividad", icon: "activity" as const },
  { href: "/catalogo/configuracion", label: "Empresa y PDF", icon: "settings" as const },
  { href: "/catalogo/cuenta", label: "Mi cuenta", icon: "account" as const },
];

export function AppNavigation({ email }: { email?: string | null }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { itemCount } = useQuoteDraft();
  const active = (href: string, exact?: boolean) => exact ? pathname === href : pathname.startsWith(href);

  const navLink = (item: (typeof primary)[number] | (typeof management)[number]) => (
    <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active(item.href, "exact" in item && item.exact) ? "bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-300/15" : "text-slate-300 hover:bg-white/7 hover:text-white"}`}>
      <Icon name={item.icon} />{item.label}{item.href === "/catalogo/presupuestos" && itemCount > 0 ? <span className="ml-auto rounded-full bg-cyan-400 px-2 py-0.5 text-[10px] font-bold text-slate-950">{itemCount}</span> : null}
    </Link>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-white/10 bg-slate-950 text-white lg:flex">
        <div className="border-b border-white/10 px-6 py-6">
          <Link href="/catalogo" className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 text-lg font-black shadow-lg shadow-cyan-950/50">C</span>
            <span><span className="block text-lg font-bold tracking-tight">Catálogo Pro</span><span className="block text-xs text-slate-400">Piezas y presupuestos</span></span>
          </Link>
        </div>
        <div className="flex-1 space-y-7 overflow-y-auto px-4 py-5">
          <nav className="space-y-1">{primary.map(navLink)}</nav>
          <Link href="/catalogo/presupuestos/nuevo" className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-950/40 transition hover:brightness-110"><Icon name="plus" />{itemCount > 0 ? `Continuar presupuesto (${itemCount})` : "Nuevo presupuesto"}</Link>
          <div><p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Gestión</p><nav className="space-y-1">{management.map(navLink)}</nav></div>
        </div>
        <div className="border-t border-white/10 p-4">
          <div className="mb-3 truncate px-3 text-xs text-slate-400">{email}</div>
          <button type="button" onClick={() => signOut({ callbackUrl: "/login" })} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-red-500/10 hover:text-red-300"><Icon name="logout" />Cerrar sesión</button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90 lg:hidden">
        <Link href="/catalogo" className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 font-black text-white">C</span><span className="font-bold tracking-tight">Catálogo Pro</span></Link>
        <button type="button" onClick={() => setMenuOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" aria-label="Abrir menú"><Icon name="menu" /></button>
      </header>

      {menuOpen ? <div className="fixed inset-0 z-50 lg:hidden"><button className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú"/><div className="absolute inset-y-0 right-0 w-[86%] max-w-sm bg-slate-950 p-5 text-white shadow-2xl"><div className="mb-6 flex items-center justify-between"><span className="text-lg font-bold">Menú</span><button onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-2xl text-slate-300">×</button></div><nav className="space-y-1">{[...primary, ...management].map(navLink)}</nav><button type="button" onClick={() => signOut({ callbackUrl: "/login" })} className="mt-6 flex w-full items-center gap-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-3 text-sm text-red-300"><Icon name="logout" />Cerrar sesión</button></div></div> : null}

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-slate-200 bg-white/95 px-3 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_rgba(15,23,42,.08)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95 lg:hidden">
        {[primary[0], primary[1]].map((item) => <Link key={item.href} href={item.href} className={`flex flex-col items-center gap-1 py-1 text-[11px] font-medium ${active(item.href, item.exact) ? "text-blue-600 dark:text-cyan-300" : "text-slate-500"}`}><Icon name={item.icon} className="h-5 w-5"/>{item.label}</Link>)}
        <Link href="/catalogo/presupuestos/nuevo" className="flex flex-col items-center gap-1 py-1 text-[11px] font-semibold text-blue-600 dark:text-cyan-300"><span className="relative -mt-5 grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-700 text-white shadow-lg shadow-blue-500/30"><Icon name="plus"/>{itemCount > 0 ? <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-cyan-300 px-1 text-[10px] font-black text-slate-950 ring-2 ring-white dark:ring-slate-950">{itemCount}</span> : null}</span>{itemCount > 0 ? "Continuar" : "Nuevo"}</Link>
      </nav>
    </>
  );
}
