import "server-only";

import crypto from "crypto";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { getR2Bucket, getR2Client, getR2PublicUrl } from "@/lib/r2";
import {
  MAX_IMAGES_PER_PART,
  validateImageFile,
} from "@/lib/image-rules";

export interface UploadedImage {
  key: string;
  url: string;
}

export function getImageFiles(formData: FormData): File[] {
  return formData
    .getAll("images")
    .filter((value): value is File => value instanceof File && value.size > 0);
}

export function validateImageFiles(files: File[], availableSlots = MAX_IMAGES_PER_PART) {
  if (files.length > Math.max(0, availableSlots)) {
    throw new Error(`Puedes guardar un máximo de ${MAX_IMAGES_PER_PART} fotos por pieza.`);
  }

  for (const file of files) {
    const error = validateImageFile(file);
    if (error) throw new Error(error);
  }
}

export async function uploadImages(files: File[]): Promise<UploadedImage[]> {
  const uploaded: UploadedImage[] = [];

  try {
    for (const file of files) {
      const input = Buffer.from(await file.arrayBuffer());
      let body: Buffer;

      try {
        body = await sharp(input, { limitInputPixels: 40_000_000 })
          .rotate()
          .resize({ width: 1200, withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer();
      } catch {
        throw new Error(`No se ha podido procesar la imagen «${file.name}».`);
      }

      const key = `uploads/${crypto.randomUUID()}.webp`;
      await getR2Client().send(
        new PutObjectCommand({
          Bucket: getR2Bucket(),
          Key: key,
          Body: body,
          ContentType: "image/webp",
        }),
      );

      uploaded.push({
        key,
        url: `${getR2PublicUrl().replace(/\/$/, "")}/${key}`,
      });
    }

    return uploaded;
  } catch (error) {
    await deleteUploadedImages(uploaded);
    throw error;
  }
}

export async function deleteUploadedImages(images: UploadedImage[]) {
  await Promise.allSettled(
    images.map((image) =>
      getR2Client().send(
        new DeleteObjectCommand({ Bucket: getR2Bucket(), Key: image.key }),
      ),
    ),
  );
}

export function getR2KeyFromUrl(url: string): string | null {
  const prefix = `${getR2PublicUrl().replace(/\/$/, "")}/`;
  return url.startsWith(prefix) ? url.slice(prefix.length) : null;
}
