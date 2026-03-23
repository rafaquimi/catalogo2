import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

/**
 * Lanza un error si no hay sesión activa.
 * Usar al principio de cada Server Action que requiere autenticación.
 */
export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("No autorizado");
  return session;
}
