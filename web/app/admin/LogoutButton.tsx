"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { SxButton } from "@/components/sx";

export default function LogoutButton() {
  return (
    <SxButton
      onClick={() => signOut({ callbackUrl: "/login" })}
      sxVariant="ghost"
      className="w-full justify-start gap-3 rounded-lg px-3 py-2.5 text-sm font-normal text-sidebar-foreground/80 transition-colors hover:bg-destructive/15 hover:text-destructive focus-visible:ring-destructive/40"
    >
      <LogOut size={18} />
      Logout
    </SxButton>
  );
}
