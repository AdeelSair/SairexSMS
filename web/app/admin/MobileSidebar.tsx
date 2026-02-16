"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { SidebarNav } from "./SidebarNav";
import LogoutButton from "./LogoutButton";
import type { NavGroup } from "@/lib/config/theme";

interface MobileSidebarProps {
  groups: NavGroup[];
  footerGroups: NavGroup[];
  userEmail: string;
  userRole: string;
}

export function MobileSidebar({
  groups,
  footerGroups,
  userEmail,
  userRole,
}: MobileSidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Hamburger trigger — visible only on mobile */}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
        aria-label="Open navigation menu"
      >
        <Menu size={22} />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="w-72 bg-sidebar p-0 text-sidebar-foreground"
          showCloseButton={false}
        >
          {/* Brand */}
          <SheetHeader className="border-b border-sidebar-border px-6 py-5">
            <SheetTitle className="text-xl font-bold tracking-tight text-sidebar-foreground">
              <span>SAIREX</span>{" "}
              <span className="text-sidebar-primary">SMS</span>
            </SheetTitle>
            <SheetDescription className="text-xs text-sidebar-foreground/50">
              {userRole.replace("_", " ")} Console
            </SheetDescription>
          </SheetHeader>

          {/* Navigation — close sheet on link click */}
          <nav className="flex-1 overflow-y-auto px-3 py-4" onClick={() => setOpen(false)}>
            <SidebarNav groups={groups} />
          </nav>

          {/* Footer */}
          <div className="space-y-1 border-t border-sidebar-border p-3">
            <div className="px-3 py-2">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {userEmail}
              </p>
              <p className="text-xs text-sidebar-foreground/50">
                {userRole.replace("_", " ")}
              </p>
            </div>
            <div onClick={() => setOpen(false)}>
              <SidebarNav groups={footerGroups} />
            </div>
            <LogoutButton />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
