"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm text-destructive/80 transition-colors hover:bg-sidebar-accent hover:text-destructive"
    >
      <LogOut size={18} />
      Logout
    </button>
  );
}
