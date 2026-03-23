import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { SignOutButton } from "./SignOutButton";

export default async function CatalogoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <header className="sticky top-0 z-10 bg-gradient-to-r from-blue-800 to-blue-900 shadow-md shadow-blue-900/30">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <Link
              className="flex items-center gap-2 text-white font-bold text-lg tracking-tight hover:text-blue-200 transition-colors"
              href="/catalogo"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-sm font-black">C</span>
              Catálogo
            </Link>
            <span className="hidden sm:block text-xs text-blue-300">{session.user?.email}</span>
          </div>
          <nav className="flex items-center gap-2">
            <Link
              className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20 transition-colors"
              href="/catalogo/nueva"
            >
              + Nueva pieza
            </Link>
            <Link
              className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20 transition-colors"
              href="/catalogo/familias"
            >
              Familias
            </Link>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
