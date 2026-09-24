import { PutObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { getR2Bucket, getR2Client } from "@/lib/r2";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return new Response("Not configured", { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const [families, auditLogs] = await Promise.all([
      prisma.family.findMany({
        orderBy: { createdAt: "asc" },
        include: {
          parts: {
            orderBy: { createdAt: "asc" },
            include: { images: { orderBy: { createdAt: "asc" } } },
          },
        },
      }),
      prisma.auditLog.findMany({ orderBy: { createdAt: "asc" } }),
    ]);

    const createdAt = new Date();
    const body = JSON.stringify({
      format: "catalogo2-backup",
      version: 1,
      createdAt: createdAt.toISOString(),
      families,
      auditLogs,
    });
    const key = `backups/catalogo-${createdAt.toISOString().replaceAll(":", "-")}.json`;

    await getR2Client().send(
      new PutObjectCommand({
        Bucket: getR2Bucket(),
        Key: key,
        Body: body,
        ContentType: "application/json",
        Metadata: { format: "catalogo2-backup", version: "1" },
      }),
    );

    await prisma.auditLog.create({
      data: {
        actorEmail: "sistema",
        action: "BACKUP",
        entityType: "SYSTEM",
        summary: "Copia diaria del catálogo creada",
        changes: { key, bytes: Buffer.byteLength(body) },
      },
    });

    return Response.json({ ok: true, key, createdAt: createdAt.toISOString() });
  } catch (error) {
    console.error("No se ha podido crear la copia diaria", error);
    return Response.json({ ok: false, error: "No se ha podido crear la copia." }, { status: 500 });
  }
}
