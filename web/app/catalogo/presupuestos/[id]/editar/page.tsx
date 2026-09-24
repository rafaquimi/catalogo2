import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPrivateImageUrl } from "@/lib/private-image";
import { QuoteBuilder } from "../../nuevo/QuoteBuilder";

export const dynamic = "force-dynamic";

export default async function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [quote, parts, customers, settings] = await Promise.all([
    prisma.quote.findUnique({ where: { id }, include: { items: { orderBy: { position: "asc" } } } }),
    prisma.part.findMany({ include: { family: true, images: { orderBy: { createdAt: "asc" }, take: 1 } }, orderBy: { updatedAt: "desc" } }),
    prisma.customer.findMany({ orderBy: { updatedAt: "desc" }, take: 100 }),
    prisma.companySettings.upsert({ where: { id: "default" }, create: { id: "default" }, update: {} }),
  ]);
  if (!quote) notFound();

  const validityDays = Math.max(1, Math.round((quote.validUntil.getTime() - quote.updatedAt.getTime()) / 86_400_000));
  return <div className="space-y-7">
    <div>
      <Link href={`/catalogo/presupuestos/${id}`} className="text-sm font-medium text-blue-600">← Volver a {quote.number}</Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Editar presupuesto</h1>
      <p className="mt-1 text-sm text-slate-500">Se conservarán el número y el historial. Al guardar volverá a estado Borrador.</p>
    </div>
    <QuoteBuilder
      parts={parts.map(part => ({ id: part.id, description: part.description, priceCents: part.priceCents, family: part.family.name, imageUrl: part.images[0] ? getPrivateImageUrl(part.images[0].id) : null }))}
      customers={customers.map(customer => ({ id: customer.id, name: customer.name, phone: customer.phone, email: customer.email }))}
      validityDays={settings.defaultValidityDays}
      initialQuote={{
        id: quote.id,
        customerId: quote.customerId,
        customerName: quote.customerName,
        customerPhone: quote.customerPhone,
        customerEmail: quote.customerEmail,
        validityDays,
        notes: quote.notes,
        items: quote.items.map(item => ({ id: item.id, partId: item.partId, description: item.description, quantity: item.quantity, unitPriceCents: item.unitPriceCents, discountBps: item.discountBps })),
      }}
    />
  </div>;
}
