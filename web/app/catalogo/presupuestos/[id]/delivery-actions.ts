"use server";

import nodemailer from "nodemailer";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-guard";
import { getAuditActor } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { generateQuotePdf } from "@/lib/quote-pdf";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] || character);
}

export async function sendQuoteEmail(id: string): Promise<{ok:boolean;error?:string}> {
  const actor = getAuditActor(await requireAuth());
  const required = ["SMTP_HOST","SMTP_USER","SMTP_PASSWORD","SMTP_FROM"] as const;
  if (required.some(key => !process.env[key])) return { ok:false, error:"El envío por email aún no está configurado en Vercel." };
  const quote = await prisma.quote.findUnique({ where:{id} });
  if (!quote?.customerEmail) return { ok:false, error:"Este cliente no tiene dirección de email." };

  try {
    const { bytes } = await generateQuotePdf(id);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: quote.customerEmail,
      subject: `Presupuesto ${quote.number}`,
      text: `Hola ${quote.customerName}, adjuntamos el presupuesto ${quote.number}.`,
      html: `<p>Hola <strong>${escapeHtml(quote.customerName)}</strong>,</p><p>Adjuntamos el presupuesto <strong>${escapeHtml(quote.number)}</strong>.</p><p>Gracias.</p>`,
      attachments: [{ filename:`${quote.number}.pdf`, content:Buffer.from(bytes), contentType:"application/pdf" }],
    });
    await prisma.$transaction([
      prisma.quote.update({ where:{id}, data:{status:"SENT"} }),
      prisma.quoteDelivery.create({ data:{quoteId:id,channel:"EMAIL",recipient:quote.customerEmail,status:"SENT"} }),
      prisma.auditLog.create({ data:{actorUserId:actor.userId,actorEmail:actor.email,action:"SEND",entityType:"QUOTE",entityId:id,summary:`${quote.number} enviado por email`} }),
    ]);
    revalidatePath(`/catalogo/presupuestos/${id}`); revalidatePath("/catalogo/presupuestos");
    return {ok:true};
  } catch (error) {
    console.error("Error enviando presupuesto",error);
    await prisma.quoteDelivery.create({ data:{quoteId:id,channel:"EMAIL",recipient:quote.customerEmail,status:"ERROR",error:"No se pudo completar el envío"} });
    return {ok:false,error:"No se ha podido enviar el email."};
  }
}
