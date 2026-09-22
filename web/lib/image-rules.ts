export const MAX_IMAGES_PER_PART = 10;
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(file.type.toLowerCase())) {
    return `El archivo «${file.name}» no tiene un formato admitido.`;
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return `La imagen «${file.name}» supera el límite de 10 MB.`;
  }

  return null;
}
