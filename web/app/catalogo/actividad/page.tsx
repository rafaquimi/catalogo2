import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const actionLabels: Record<string, string> = {
  CREATE: "Creación",
  UPDATE: "Modificación",
  DELETE: "Borrado",
  LOGIN: "Acceso",
  BACKUP: "Copia",
};

const actionStyles: Record<string, string> = {
  CREATE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  UPDATE: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  LOGIN: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  BACKUP: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "Europe/Madrid",
  }).format(date);
}

export default async function ActivityPage() {
  await requireAuth();

  const entries = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Actividad y auditoría</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Últimas 200 operaciones realizadas en el catálogo. Este historial no contiene contraseñas ni secretos.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {entries.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">Todavía no hay actividad registrada.</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {entries.map((entry) => (
              <article key={entry.id} className="space-y-2 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${actionStyles[entry.action] ?? "bg-slate-100 text-slate-700"}`}>
                      {actionLabels[entry.action] ?? entry.action}
                    </span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">{entry.summary}</span>
                  </div>
                  <time className="text-xs text-slate-500" dateTime={entry.createdAt.toISOString()}>
                    {formatDate(entry.createdAt)}
                  </time>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>Usuario: {entry.actorEmail}</span>
                  <span>Tipo: {entry.entityType}</span>
                  {entry.entityId ? <span>ID: {entry.entityId}</span> : null}
                </div>
                {entry.changes ? (
                  <details className="text-xs text-slate-600 dark:text-slate-400">
                    <summary className="cursor-pointer select-none font-medium hover:text-blue-600">Ver detalles técnicos</summary>
                    <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-50 p-3 dark:bg-slate-950">{JSON.stringify(entry.changes, null, 2)}</pre>
                  </details>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
