"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getAuditActor } from "@/lib/audit";
import { calculateLineTotal, calculateQuoteTotals } from "@/lib/quote-calculations";

const itemSchema = z.object({
  partId: z.string().min(1).nullable(),
  description: z.string().trim().min(1).max(500),
  quantity: z.number().int().min(1).max(9999),
  unitPriceCents: z.number().int().min(0).max(100_000_000),
  discountBps: z.number().int().min(0).max(10_000),
});

const quoteSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().trim().min(2).max(150),
  customerPhone: z.string().trim().min(5).max(30),
  customerEmail: z.union([z.literal(""), z.string().trim().email()]).optional(),
  validityDays: z.number().int().min(1).max(365),
  notes: z.string().trim().max(2000).optional(),
  items: z.array(itemSchema).min(1).max(100),
});

export interface QuoteActionResult { ok: boolean; error?: string; quoteId?: string }

export async function createQuote(input: unknown): Promise<QuoteActionResult> {
  const actor = getAuditActor(await requireAuth());
  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message || "Revisa los datos." };

  const data = parsed.data;
  let quoteId = "";

  try {
    quoteId = await prisma.$transaction(async (transaction) => {
      const settings = await transaction.companySettings.upsert({
        where: { id: "default" }, create: { id: "default" }, update: {},
      });

      let customer = data.customerId ? await transaction.customer.findUnique({ where: { id: data.customerId } }) : null;
      if (customer) {
        customer = await transaction.customer.update({
          where: { id: customer.id },
          data: { name: data.customerName, phone: data.customerPhone, email: data.customerEmail || null },
        });
      } else {
        customer = await transaction.customer.create({
          data: { name: data.customerName, phone: data.customerPhone, email: data.customerEmail || null },
        });
      }

      const year = new Date().getFullYear();
      const counter = await transaction.quoteCounter.upsert({
        where: { year },
        create: { year, nextValue: 2 },
        update: { nextValue: { increment: 1 } },
      });
      const sequence = counter.nextValue - 1;
      const number = `${settings.quotePrefix || "PRE"}-${year}-${String(sequence).padStart(4, "0")}`;
      const totals = calculateQuoteTotals(data.items, settings.defaultTaxBps);
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + data.validityDays);

      const quote = await transaction.quote.create({
        data: {
          number,
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          customerEmail: customer.email,
          validUntil,
          notes: data.notes || null,
          taxRateBps: settings.defaultTaxBps,
          ...totals,
          createdBy: actor.email,
          items: {
            create: data.items.map((item, position) => ({
              ...item,
              totalCents: calculateLineTotal(item),
              position,
            })),
          },
        },
      });

      await transaction.auditLog.create({
        data: {
          actorUserId: actor.userId,
          actorEmail: actor.email,
          action: "CREATE",
          entityType: "QUOTE",
          entityId: quote.id,
          summary: `Presupuesto ${quote.number} creado`,
          changes: { customer: customer.name, itemCount: data.items.length, totalCents: totals.totalCents },
        },
      });
      return quote.id;
    });
  } catch (error) {
    console.error("No se ha podido crear el presupuesto", error);
    return { ok: false, error: "No se ha podido guardar el presupuesto." };
  }

  revalidatePath("/catalogo/presupuestos");
  return { ok: true, quoteId };
}

export async function updateQuote(id: string, input: unknown): Promise<QuoteActionResult> {
  const actor = getAuditActor(await requireAuth());
  const parsedId = z.string().min(1).safeParse(id);
  const parsed = quoteSchema.safeParse(input);
  if (!parsedId.success || !parsed.success) return { ok: false, error: parsed.success ? "Presupuesto no válido." : parsed.error.issues[0]?.message || "Revisa los datos." };

  const data = parsed.data;
  try {
    await prisma.$transaction(async transaction => {
      const previous = await transaction.quote.findUnique({ where: { id }, select: { number: true, status: true, taxRateBps: true } });
      if (!previous) throw new Error("Presupuesto no encontrado.");

      let customer = data.customerId ? await transaction.customer.findUnique({ where: { id: data.customerId } }) : null;
      if (customer) {
        customer = await transaction.customer.update({
          where: { id: customer.id },
          data: { name: data.customerName, phone: data.customerPhone, email: data.customerEmail || null },
        });
      } else {
        customer = await transaction.customer.create({
          data: { name: data.customerName, phone: data.customerPhone, email: data.customerEmail || null },
        });
      }

      const totals = calculateQuoteTotals(data.items, previous.taxRateBps);
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + data.validityDays);

      await transaction.quote.update({
        where: { id },
        data: {
          status: "DRAFT",
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          customerEmail: customer.email,
          validUntil,
          notes: data.notes || null,
          ...totals,
          items: {
            deleteMany: {},
            create: data.items.map((item, position) => ({
              ...item,
              totalCents: calculateLineTotal(item),
              position,
            })),
          },
        },
      });

      await transaction.auditLog.create({ data: {
        actorUserId: actor.userId,
        actorEmail: actor.email,
        action: "UPDATE",
        entityType: "QUOTE",
        entityId: id,
        summary: `Presupuesto ${previous.number} editado`,
        changes: { previousStatus: previous.status, newStatus: "DRAFT", customer: customer.name, itemCount: data.items.length, totalCents: totals.totalCents },
      }});
    });
  } catch (error) {
    console.error("No se ha podido editar el presupuesto", error);
    return { ok: false, error: "No se han podido guardar los cambios." };
  }

  revalidatePath(`/catalogo/presupuestos/${id}`);
  revalidatePath(`/catalogo/presupuestos/${id}/editar`);
  revalidatePath("/catalogo/presupuestos");
  return { ok: true, quoteId: id };
}

const allowedStatuses = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"] as const;

export async function updateQuoteStatus(id: string, status: string) {
  const actor = getAuditActor(await requireAuth());
  const parsed = z.enum(allowedStatuses).safeParse(status);
  if (!parsed.success) throw new Error("Estado no válido.");

  const previous = await prisma.quote.findUniqueOrThrow({ where: { id }, select: { status: true, number: true } });
  await prisma.$transaction([
    prisma.quote.update({ where: { id }, data: { status: parsed.data } }),
    prisma.auditLog.create({ data: {
      actorUserId: actor.userId, actorEmail: actor.email, action: "UPDATE", entityType: "QUOTE", entityId: id,
      summary: `Estado de ${previous.number} actualizado`, changes: { before: previous.status, after: parsed.data },
    }}),
  ]);
  revalidatePath(`/catalogo/presupuestos/${id}`);
  revalidatePath("/catalogo/presupuestos");
}

export async function recordWhatsAppShare(id: string) {
  const actor = getAuditActor(await requireAuth());
  const quote = await prisma.quote.findUniqueOrThrow({ where: { id }, select: { number: true, customerPhone: true } });
  await prisma.$transaction([
    prisma.quoteDelivery.create({ data: { quoteId: id, channel: "WHATSAPP", recipient: quote.customerPhone, status: "SHARED" } }),
    prisma.auditLog.create({ data: { actorUserId: actor.userId, actorEmail: actor.email, action: "SHARE", entityType: "QUOTE", entityId: id, summary: `${quote.number} compartido por WhatsApp` } }),
  ]);
  revalidatePath(`/catalogo/presupuestos/${id}`);
}
