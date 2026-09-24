import { requireAuth } from "@/lib/auth-guard";
import { generateQuotePdf } from "@/lib/quote-pdf";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  try {
    const { id } = await params;
    const { bytes, quote } = await generateQuotePdf(id);
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${quote.number}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("Presupuesto no encontrado", { status: 404 });
  }
}
