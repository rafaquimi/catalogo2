import { prisma } from "@/lib/prisma";
import { QuoteBuilder } from "./QuoteBuilder";
import { getPrivateImageUrl } from "@/lib/private-image";

export const dynamic = "force-dynamic";

export default async function NewQuotePage({ searchParams }: { searchParams: Promise<{ pieza?: string }> }) {
  const { pieza } = await searchParams;
  const [parts, customers, settings] = await Promise.all([
    prisma.part.findMany({ include: { family: true, images: { orderBy: { createdAt: "asc" }, take: 1 } }, orderBy: { updatedAt: "desc" } }),
    prisma.customer.findMany({ orderBy: { updatedAt: "desc" }, take: 100 }),
    prisma.companySettings.upsert({ where: { id: "default" }, create: { id: "default" }, update: {} }),
  ]);
  return <div className="space-y-7"><div><p className="text-sm font-semibold text-blue-600 dark:text-cyan-300">Presupuestos</p><h1 className="text-3xl font-bold tracking-tight">Nuevo presupuesto</h1><p className="mt-1 text-sm text-slate-500">Selecciona el cliente y añade las piezas. Los precios ya incluyen IVA.</p></div><QuoteBuilder parts={parts.map(p=>({id:p.id,description:p.description,priceCents:p.priceCents,family:p.family.name,imageUrl:p.images[0]?getPrivateImageUrl(p.images[0].id):null}))} customers={customers.map(c=>({id:c.id,name:c.name,phone:c.phone,email:c.email}))} validityDays={settings.defaultValidityDays} initialPartId={pieza}/></div>;
}
