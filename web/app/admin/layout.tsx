import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import { navigation } from "@/lib/config/theme";
import { isSimpleMode, resolveOrganizationMode } from "@/lib/system/mode.service";
import { prisma } from "@/lib/prisma";
import { SystemSidebar } from "@/components/layout/system-sidebar";
import { SidebarNav } from "./SidebarNav";
import LogoutButton from "./LogoutButton";
import { MobileSidebar } from "./MobileSidebar";
import { ThemeToggle } from "./ThemeToggle";
import { ModeToggleButton } from "./ModeToggleButton";

const FOOTER_NAV_GROUPS = [
  {
    label: "",
    items: [
      {
        label: "Change Password",
        href: "/admin/change-password",
        icon: "KeyRound",
      },
    ],
  },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as {
    email?: string | null;
    role?: string;
    platformRole?: string | null;
    organizationId?: string | null;
  };

  // Redirect to onboarding if user has no org and isn't a platform admin
  if (!user.organizationId && !user.platformRole) {
    redirect("/onboarding/identity");
  }

  const userEmail = user.email || "";
  const displayRole = user.platformRole || user.role;
  const userRole = displayRole?.replace("_", " ") || "Admin";
  const orgMode = user.organizationId
    ? await resolveOrganizationMode(user.organizationId)
    : { mode: "PRO" as const, isSimple: false };
  const organizationBranding = user.organizationId
    ? await prisma.organization.findUnique({
        where: { id: user.organizationId },
        select: { logoUrl: true },
      })
    : null;
  const tenantLogoUrl = organizationBranding?.logoUrl || "/sairex-logo.svg";
  const simpleMode = isSimpleMode(orgMode.mode);
  const filteredNavigation = simpleMode
    ? navigation
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => !item.proOnly),
        }))
        .filter((group) => group.items.length > 0)
    : navigation;

  return (
    <div className="flex h-screen flex-col md:flex-row">
      {/* ── Mobile top bar ──────────────────────────────────── */}
      <header className="flex items-center justify-between border-b border-sidebar-border bg-sidebar px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <Image
            src={tenantLogoUrl}
            alt="Tenant logo"
            width={24}
            height={24}
            className="rounded-sm bg-background/90 p-0.5"
          />
          <h1 className="text-lg font-bold tracking-tight text-sidebar-foreground">
            <span>SAIREX</span>{" "}
            <span className="text-sidebar-primary">SMS</span>
          </h1>
        </div>
        <MobileSidebar
          groups={filteredNavigation}
          footerGroups={FOOTER_NAV_GROUPS}
          userEmail={userEmail}
          userRole={userRole}
        />
      </header>

      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <SystemSidebar className="hidden w-64 flex-col border-r border-sidebar-border md:flex">
        {/* Brand */}
        <div className="border-b border-sidebar-border px-6 py-5">
          <div className="mb-2 flex items-center gap-2">
            <Image
              src={tenantLogoUrl}
              alt="Tenant logo"
              width={28}
              height={28}
              className="rounded-sm bg-background/90 p-0.5"
            />
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-sidebar-foreground">SAIREX</span>{" "}
              <span className="text-sidebar-primary">SMS</span>
            </h1>
          </div>
          <p className="mt-0.5 text-xs text-sidebar-foreground/50">
            {userRole} Console
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <SidebarNav groups={filteredNavigation} />
        </nav>

        {/* Footer: user info + actions */}
        <div className="space-y-1 border-t border-sidebar-border p-3">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {userEmail}
            </p>
            <p className="text-xs text-sidebar-foreground/50">{userRole}</p>
          </div>
          <SidebarNav groups={FOOTER_NAV_GROUPS} />
          <LogoutButton />
          {user.organizationId && (
            <ModeToggleButton currentMode={orgMode.mode} />
          )}
          <div className="px-1 pt-2">
            <ThemeToggle />
          </div>
          <p className="px-2 py-2 text-center text-xs text-sidebar-foreground/60">
            Powered by <span className="font-semibold">Sairex Technologies</span>
          </p>
        </div>
      </SystemSidebar>

      {/* ── Main content area ───────────────────────────────── */}
      <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
