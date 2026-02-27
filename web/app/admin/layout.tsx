import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import { navigation } from "@/lib/config/theme";
import { isSimpleMode, resolveOrganizationMode } from "@/lib/system/mode.service";
import { prisma } from "@/lib/prisma";
import { SystemSidebar } from "@/components/layout/system-sidebar";
import { resolveOrganizationBrandingCapabilities } from "@/lib/billing/branding-capabilities.service";
import { SidebarNav } from "./SidebarNav";
import LogoutButton from "./LogoutButton";
import { MobileSidebar } from "./MobileSidebar";
import { SidebarScrollNav } from "./SidebarScrollNav";
import packageJson from "../../package.json";

const FOOTER_NAV_GROUPS = [
  {
    label: "",
    items: [
      {
        label: "Settings",
        href: "/admin/settings",
        icon: "Settings",
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
  const branding = user.organizationId
    ? await resolveOrganizationBrandingCapabilities(user.organizationId)
    : null;
  const organizationBranding = user.organizationId
    ? await prisma.organization.findUnique({
        where: { id: user.organizationId },
        select: { logoUrl: true },
      })
    : null;
  const tenantLogoUrl =
    branding?.capabilities.customLogo && organizationBranding?.logoUrl
      ? organizationBranding.logoUrl
      : "/sairex-logo.svg";
  const simpleMode = isSimpleMode(orgMode.mode);
  const filteredNavigation = simpleMode
    ? navigation
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => !item.proOnly),
        }))
        .filter((group) => group.items.length > 0)
    : navigation;

  const appVersion = `v${packageJson.version}`;

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
          <p className="mt-0.5 text-xs font-semibold" style={{ color: "#39B54A" }}>
            {userRole} Console
          </p>
        </div>

        {/* Navigation */}
        <SidebarScrollNav groups={filteredNavigation} />

        {/* Footer: user info + actions */}
        <div className="space-y-1 border-t border-sidebar-border p-3">
          <SidebarNav groups={FOOTER_NAV_GROUPS} />
          <LogoutButton />
        </div>
      </SystemSidebar>

      <div className="flex min-h-0 flex-1 flex-col">
        {/* ── Main content area ───────────────────────────────── */}
        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
          {children}
        </main>

        <footer
          className="border-t border-sidebar-border px-4 py-2 text-xs font-semibold md:px-6"
          style={{ backgroundColor: "#39B54A", color: "#0F2F57" }}
        >
          <div className="flex items-center justify-between gap-4">
            <p className="truncate">
              User: <span>{userEmail}</span>
            </p>
            <p className="text-center">Powered by SAIR Techonolgies</p>
            <p className="shrink-0 text-right">{appVersion}</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
