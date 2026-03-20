import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EditarPiezaForm } from "./EditarPiezaForm";

export default async function EditarPiezaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [part, families] = await Promise.all([
    prisma.part.findUnique({
      where: { id },
      include: { images: { orderBy: { createdAt: "asc" } } },
    }),
    prisma.family.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!part) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Editar pieza</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Modifica los datos, añade o elimina fotos.
        </p>
      </div>
      <EditarPiezaForm part={part} families={families} />
    </div>
  );
}
