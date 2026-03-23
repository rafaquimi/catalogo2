"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20 transition-colors"
      onClick={() => signOut({ callbackUrl: "/login" })}
      type="button"
    >
      Salir
    </button>
  );
}
