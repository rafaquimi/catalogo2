export function getPrivateImageUrl(imageId: string): string {
  return `/api/images/${encodeURIComponent(imageId)}`;
}
