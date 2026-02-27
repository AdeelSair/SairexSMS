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
import { SxButton } from "@/components/sx";
import type { NavGroup } from "@/lib/config/theme";

interface MobileSidebarProps {
  groups: NavGroup[];
  footerGroups: NavGroup[];
  userRole: string;
}

export function MobileSidebar({
  groups,
  footerGroups,
  userRole,
}: MobileSidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Hamburger trigger — visible only on mobile */}
      <SxButton
        sxVariant="ghost"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
        aria-label="Open navigation menu"
      >
        <Menu size={22} />
      </SxButton>

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
            <SheetDescription className="text-xs font-semibold" style={{ color: "#39B54A" }}>
              {userRole.replace("_", " ")} Console
            </SheetDescription>
          </SheetHeader>

          {/* Navigation — close sheet on link click */}
          <nav
            className="sidebar-scrollbar flex-1 overflow-y-auto px-3 py-4"
            onClick={() => setOpen(false)}
          >
            <SidebarNav groups={groups} />
          </nav>

          {/* Footer */}
          <div className="space-y-1 border-t border-sidebar-border p-3">
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
