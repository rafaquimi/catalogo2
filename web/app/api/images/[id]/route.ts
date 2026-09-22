import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getR2Bucket, getR2Client } from "@/lib/r2";
import { getR2KeyFromUrl } from "@/lib/image-storage";
import { prisma } from "@/lib/prisma";

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response("No autorizado", {
      status: 401,
      headers: privateHeaders,
    });
  }

  const { id } = await params;
  const image = await prisma.partImage.findUnique({
    where: { id },
    select: { url: true },
  });

  if (!image) {
    return new Response("Imagen no encontrada", {
      status: 404,
      headers: privateHeaders,
    });
  }

  const key = getR2KeyFromUrl(image.url);
  if (!key) {
    return new Response("Imagen no disponible", {
      status: 404,
      headers: privateHeaders,
    });
  }

  try {
    const object = await getR2Client().send(
      new GetObjectCommand({ Bucket: getR2Bucket(), Key: key }),
    );

    if (!object.Body) {
      return new Response("Imagen no encontrada", {
        status: 404,
        headers: privateHeaders,
      });
    }

    const headers = new Headers(privateHeaders);
    headers.set("Content-Type", object.ContentType || "image/webp");
    if (object.ContentLength !== undefined) {
      headers.set("Content-Length", String(object.ContentLength));
    }

    return new Response(object.Body.transformToWebStream(), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("No se ha podido cargar una imagen privada de R2", error);
    return new Response("Imagen no disponible", {
      status: 502,
      headers: privateHeaders,
    });
  }
}
