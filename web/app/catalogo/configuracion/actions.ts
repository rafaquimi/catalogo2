"use server";

import crypto from "crypto";
import sharp from "sharp";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getAuditActor } from "@/lib/audit";
import { getR2Bucket, getR2Client, getR2PublicUrl } from "@/lib/r2";
import { encryptSecret } from "@/lib/secret-crypto";
import { createSmtpTransport, getSmtpConfig } from "@/lib/smtp";

export interface SettingsResult { ok:boolean; error?:string }

const checkbox = z.preprocess(value => value === "on" || value === "true", z.boolean());
const schema=z.object({
  businessName:z.string().trim().min(2).max(150), taxId:z.string().trim().max(30), address:z.string().trim().max(200),
  postalCode:z.string().trim().max(15), city:z.string().trim().max(100), province:z.string().trim().max(100),
  phone:z.string().trim().max(30), email:z.union([z.literal(""),z.string().email()]), website:z.string().trim().max(200),
  quotePrefix:z.string().trim().min(1).max(10).regex(/^[A-Za-z0-9-]+$/), defaultValidityDays:z.coerce.number().int().min(1).max(365),
  smtpTableReady:checkbox.default(false), smtpEnabled:checkbox.default(false), smtpHost:z.string().trim().max(200).default(""),
  smtpPort:z.coerce.number().int().min(1).max(65535).default(587), smtpSecure:checkbox.default(false),
  smtpUser:z.string().trim().max(200).default(""), smtpPassword:z.string().max(500).default(""), smtpFrom:z.string().trim().max(250).default(""),
});

export async function updateCompanySettings(formData:FormData):Promise<SettingsResult>{
 const actor=getAuditActor(await requireAuth());
 const parsed=schema.safeParse(Object.fromEntries([...formData.entries()].filter(([key])=>key!=="logo")));
 if(!parsed.success)return{ok:false,error:parsed.error.issues[0]?.message||"Revisa los datos."};
 const {smtpTableReady,smtpEnabled,smtpHost,smtpPort,smtpSecure,smtpUser,smtpPassword,smtpFrom,...companyData}=parsed.data;
 let logoUrl: string|undefined;
 const logo=formData.get("logo");
 if(logo instanceof File&&logo.size>0){
   if(logo.size>5*1024*1024||!logo.type.startsWith("image/"))return{ok:false,error:"El logo debe ser una imagen de hasta 5 MB."};
   try{
     const png=await sharp(Buffer.from(await logo.arrayBuffer())).rotate().resize({width:700,height:300,fit:"inside",withoutEnlargement:true}).png({quality:90}).toBuffer();
     const key=`branding/logo-${crypto.randomUUID()}.png`;
     await getR2Client().send(new PutObjectCommand({Bucket:getR2Bucket(),Key:key,Body:png,ContentType:"image/png"}));
     logoUrl=`${getR2PublicUrl().replace(/\/$/,"")}/${key}`;
   }catch{return{ok:false,error:"No se ha podido procesar el logo."};}
 }
 try{
   const operations:Prisma.PrismaPromise<unknown>[]=[
     prisma.companySettings.upsert({where:{id:"default"},create:{id:"default",...companyData,...(logoUrl?{logoUrl}:{})},update:{...companyData,...(logoUrl?{logoUrl}:{})}}),
   ];
   if(smtpTableReady){
     const current=await prisma.emailSettings.findUnique({where:{id:"default"}});
     const passwordEncrypted=smtpPassword?encryptSecret(smtpPassword):current?.passwordEncrypted;
     if(smtpEnabled&&(!smtpHost||!smtpUser||!smtpFrom||!passwordEncrypted))return{ok:false,error:"Para activar el correo completa servidor, usuario, remitente y contraseña."};
     operations.push(prisma.emailSettings.upsert({
       where:{id:"default"},
       create:{id:"default",enabled:smtpEnabled,host:smtpHost,port:smtpPort,secure:smtpSecure,user:smtpUser,fromAddress:smtpFrom,passwordEncrypted},
       update:{enabled:smtpEnabled,host:smtpHost,port:smtpPort,secure:smtpSecure,user:smtpUser,fromAddress:smtpFrom,...(smtpPassword?{passwordEncrypted}:{})},
     }));
   }
   operations.push(prisma.auditLog.create({data:{actorUserId:actor.userId,actorEmail:actor.email,action:"UPDATE",entityType:"COMPANY_SETTINGS",entityId:"default",summary:"Configuración de empresa actualizada",changes:{logoChanged:Boolean(logoUrl),emailSettingsChanged:smtpTableReady,passwordChanged:Boolean(smtpPassword)}}}));
   await prisma.$transaction(operations);
 }catch(error){console.error(error);return{ok:false,error:"No se ha podido guardar la configuración."};}
 revalidatePath("/catalogo/configuracion"); return{ok:true};
}

export async function testSmtpConnection():Promise<SettingsResult>{
 await requireAuth();
 const config=await getSmtpConfig();
 if(!config)return{ok:false,error:"Guarda y activa primero la configuración del correo."};
 try{
   await createSmtpTransport(config).verify();
   return{ok:true};
 }catch(error){
   console.error("Error verificando SMTP",error);
   const smtpError=error as Error&{code?:string;responseCode?:number};
   if(smtpError.code==="EAUTH"||smtpError.responseCode===535)return{ok:false,error:"Gmail ha rechazado el usuario o la contraseña. Usa una contraseña de aplicación de Google, no la contraseña normal."};
   if(smtpError.code==="ETIMEDOUT"||smtpError.code==="ESOCKET")return{ok:false,error:"El servidor SMTP no ha respondido. Comprueba el puerto y el tipo de cifrado."};
   if(smtpError.code==="EDNS")return{ok:false,error:"No se encuentra el servidor SMTP. Comprueba el nombre smtp.gmail.com."};
   return{ok:false,error:`No se ha podido conectar con Gmail${smtpError.code?` (${smtpError.code})`:""}.`};
 }
}
