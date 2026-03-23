"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { getR2Client, getR2Bucket, getR2PublicUrl } from "@/lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import sharp from "sharp";

const createPartSchema = z.object({
  description: z.string().min(1),
  familyId: z.string().min(1),
  price: z
    .string()
    .min(1)
    .transform((v, ctx) => {
      const n = parseFloat(v.replace(",", "."));
      if (isNaN(n) || n < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Precio inválido" });
        return z.NEVER;
      }
      return n;
    }),
});

export async function createPart(formData: FormData) {
  await requireAuth();

  const raw = {
    description: String(formData.get("description") ?? ""),
    familyId: String(formData.get("familyId") ?? ""),
    price: String(formData.get("price") ?? ""),
  };

  const parsed = createPartSchema.safeParse(raw);
  if (!parsed.success) throw new Error("Datos inválidos.");

  const files = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0);

  const priceCents = Math.round(parsed.data.price * 100);

  const part = await prisma.part.create({
    data: {
      description: parsed.data.description,
      familyId: parsed.data.familyId,
      priceCents,
    },
  });

  if (files.length > 0) {
    const imagesData: { url: string; partId: string }[] = [];

    for (const file of files) {
      const inputBuf = Buffer.from(await file.arrayBuffer());

      let uploadBuf: Buffer;
      let contentType: string;
      let ext: string;

      try {
        // Convertir a WebP: auto-rotar por EXIF (importante en fotos de iPhone), máx 1200px, calidad 82
        uploadBuf = await sharp(inputBuf)
          .rotate()
          .resize({ width: 1200, withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer();
        contentType = "image/webp";
        ext = "webp";
      } catch {
        // Fallback: subir imagen original (puede ser HEIC, JPEG, PNG...)
        uploadBuf = inputBuf;
        contentType = file.type || "image/jpeg";
        ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      }

      const key = `uploads/${crypto.randomUUID()}.${ext}`;

      try {
        await getR2Client().send(
          new PutObjectCommand({
            Bucket: getR2Bucket(),
            Key: key,
            Body: uploadBuf,
            ContentType: contentType,
          })
        );
      } catch (r2err) {
        console.error("[R2 Upload Error]", r2err);
        throw new Error(`Error subiendo imagen a R2: ${r2err instanceof Error ? r2err.message : String(r2err)}`);
      }

      imagesData.push({ url: `${getR2PublicUrl()}/${key}`, partId: part.id });
    }

    await prisma.partImage.createMany({ data: imagesData });
  }

  revalidatePath("/catalogo");
  redirect(`/catalogo/${part.id}`);
}
