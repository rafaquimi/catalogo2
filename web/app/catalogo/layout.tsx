import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { AppNavigation } from "./AppNavigation";

export default async function CatalogoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <AppNavigation email={session.user?.email} />
      <main className="min-h-screen px-4 pb-28 pt-6 sm:px-6 lg:ml-72 lg:px-10 lg:pb-12 lg:pt-10">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
