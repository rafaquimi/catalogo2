import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { CuentaForm } from "./CuentaForm";

export const dynamic = "force-dynamic";

export default async function CuentaPage() {
  const session = await requireAuth();
  const userId = (session.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cuenta del administrador</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Cambia el correo de acceso o establece una contraseña nueva.
        </p>
      </div>
      <CuentaForm email={user.email} />
    </div>
  );
}
