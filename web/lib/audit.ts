import "server-only";

import type { Session } from "next-auth";

export interface AuditActor {
  userId: string;
  email: string;
}

export function getAuditActor(session: Session): AuditActor {
  const user = session.user as { id?: string; email?: string | null } | undefined;

  if (!user?.id || !user.email) {
    throw new Error("No se ha podido identificar al usuario de la operación.");
  }

  return { userId: user.id, email: user.email };
}
