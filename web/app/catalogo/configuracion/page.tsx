import { prisma } from "@/lib/prisma";
import { CompanySettingsForm } from "./CompanySettingsForm";

export const dynamic="force-dynamic";
export default async function SettingsPage(){
 const settings=await prisma.companySettings.upsert({where:{id:"default"},create:{id:"default"},update:{}});
 const smtpReady=["SMTP_HOST","SMTP_USER","SMTP_PASSWORD","SMTP_FROM"].every(k=>Boolean(process.env[k]));
 return <div className="mx-auto max-w-4xl space-y-7"><div><p className="text-sm font-semibold text-blue-600 dark:text-cyan-300">Configuración</p><h1 className="text-3xl font-bold tracking-tight">Empresa y documentos</h1><p className="mt-1 text-sm text-slate-500">Personaliza los datos que verán tus clientes.</p></div><div className={`rounded-xl border px-4 py-3 text-sm ${smtpReady?"border-emerald-200 bg-emerald-50 text-emerald-700":"border-amber-200 bg-amber-50 text-amber-800"}`}>{smtpReady?"El envío automático por email está configurado.":"El PDF y WhatsApp funcionarán, pero falta configurar el servidor de correo en Vercel."}</div><CompanySettingsForm settings={{...settings}}/></div>;
}
