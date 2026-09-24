import { prisma } from "@/lib/prisma";
import { CompanySettingsForm } from "./CompanySettingsForm";

export const dynamic="force-dynamic";

export default async function SettingsPage(){
 const settings=await prisma.companySettings.upsert({where:{id:"default"},create:{id:"default"},update:{}});
 let smtpTableReady=true;
 let emailSettings:null|{enabled:boolean;host:string;port:number;secure:boolean;user:string;fromAddress:string;passwordEncrypted:string|null}=null;
 try{ emailSettings=await prisma.emailSettings.findUnique({where:{id:"default"}}); }
 catch(error){ console.warn("EmailSettings todavía no está disponible.",error); smtpTableReady=false; }
 const envReady=["SMTP_HOST","SMTP_USER","SMTP_PASSWORD","SMTP_FROM"].every(key=>Boolean(process.env[key]));
 const smtpReady=Boolean(emailSettings?.enabled&&emailSettings.host&&emailSettings.user&&emailSettings.fromAddress&&emailSettings.passwordEncrypted)||envReady;
 return <div className="mx-auto max-w-4xl space-y-7"><div><p className="text-sm font-semibold text-blue-600 dark:text-cyan-300">Configuración</p><h1 className="text-3xl font-bold tracking-tight">Empresa y documentos</h1><p className="mt-1 text-sm text-slate-500">Personaliza los datos que verán tus clientes y configura los envíos.</p></div><div className={`rounded-xl border px-4 py-3 text-sm ${smtpReady?"border-emerald-200 bg-emerald-50 text-emerald-700":"border-amber-200 bg-amber-50 text-amber-800"}`}>{smtpReady?"El envío automático por email está configurado.":smtpTableReady?"Configura el servidor de correo en esta pantalla para enviar presupuestos.":"Falta realizar la activación inicial del correo en Supabase."}</div><CompanySettingsForm settings={{...settings}} emailSettings={{tableReady:smtpTableReady,enabled:emailSettings?.enabled??false,host:emailSettings?.host??"",port:emailSettings?.port??587,secure:emailSettings?.secure??false,user:emailSettings?.user??"",fromAddress:emailSettings?.fromAddress??"",passwordConfigured:Boolean(emailSettings?.passwordEncrypted)}}/></div>;
}
