"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavGroup } from "@/lib/config/theme";
import {
  LayoutDashboard,
  Building2,
  Map,
  School,
  GraduationCap,
  Wallet,
  Users,
  KeyRound,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  LayoutDashboard,
  Building2,
  Map,
  School,
  GraduationCap,
  Wallet,
  Users,
  KeyRound,
};

interface SidebarNavProps {
  groups: NavGroup[];
}

export function SidebarNav({ groups }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <div className="space-y-4">
      {groups.map((group, gi) => (
        <div key={gi}>
          {group.label && (
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              {group.label}
            </p>
          )}

          <div className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = ICON_MAP[item.icon];
              const isActive =
                pathname === item.href ||
                (item.href !== "/admin/dashboard" &&
                  pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                    isActive
                      ? "border-l-2 border-sidebar-primary bg-sidebar-accent font-medium text-sidebar-primary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  )}
                >
                  {Icon && <Icon size={18} />}
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
