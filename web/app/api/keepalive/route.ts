import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return new Response("Not configured", { status: 503 });
  }

  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // Mantiene activa la conexión y evita que crezca indefinidamente el
    // historial utilizado para limitar los intentos de acceso.
    await prisma.$transaction([
      prisma.$queryRaw`SELECT 1`,
      prisma.loginAttempt.deleteMany({
        where: {
          createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

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
