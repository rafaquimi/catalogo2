"use server";

import crypto from "crypto";
import sharp from "sharp";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getAuditActor } from "@/lib/audit";
import { getR2Bucket, getR2Client, getR2PublicUrl } from "@/lib/r2";

export interface SettingsResult { ok:boolean; error?:string }

const schema=z.object({
  businessName:z.string().trim().min(2).max(150), taxId:z.string().trim().max(30), address:z.string().trim().max(200),
  postalCode:z.string().trim().max(15), city:z.string().trim().max(100), province:z.string().trim().max(100),
  phone:z.string().trim().max(30), email:z.union([z.literal(""),z.string().email()]), website:z.string().trim().max(200),
  quotePrefix:z.string().trim().min(1).max(10).regex(/^[A-Za-z0-9-]+$/), defaultValidityDays:z.coerce.number().int().min(1).max(365),
});

export async function updateCompanySettings(formData:FormData):Promise<SettingsResult>{
 const actor=getAuditActor(await requireAuth());
 const parsed=schema.safeParse(Object.fromEntries([...formData.entries()].filter(([key])=>key!=="logo")));
 if(!parsed.success)return{ok:false,error:parsed.error.issues[0]?.message||"Revisa los datos."};
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
   await prisma.$transaction(async tx=>{
     await tx.companySettings.upsert({where:{id:"default"},create:{id:"default",...parsed.data,...(logoUrl?{logoUrl}:{})},update:{...parsed.data,...(logoUrl?{logoUrl}:{})}});
     await tx.auditLog.create({data:{actorUserId:actor.userId,actorEmail:actor.email,action:"UPDATE",entityType:"COMPANY_SETTINGS",entityId:"default",summary:"Datos de empresa y PDF actualizados",changes:{logoChanged:Boolean(logoUrl)}}});
   });
 }catch(error){console.error(error);return{ok:false,error:"No se ha podido guardar la configuración."};}
 revalidatePath("/catalogo/configuracion"); return{ok:true};
}
