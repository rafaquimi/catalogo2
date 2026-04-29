import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // Hace una consulta ligera para mantener activa la conexión con Supabase
    await prisma.$queryRaw`SELECT 1`;

    return Response.json({
      ok: true,
      message: "Keep alive ejecutado",
      time: new Date().toISOString(),
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
