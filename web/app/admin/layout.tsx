import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { navigation } from "@/lib/config/theme";
import { SidebarNav } from "./SidebarNav";
import LogoutButton from "./LogoutButton";
import { MobileSidebar } from "./MobileSidebar";

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
  };

  const userEmail = user.email || "";
  const userRole = user.role?.replace("_", " ") || "Admin";

  return (
    <div className="flex h-screen flex-col md:flex-row">
      {/* ── Mobile top bar ──────────────────────────────────── */}
      <header className="flex items-center justify-between border-b border-sidebar-border bg-sidebar px-4 py-3 md:hidden">
        <h1 className="text-lg font-bold tracking-tight text-sidebar-foreground">
          <span>SAIREX</span>{" "}
          <span className="text-sidebar-primary">SMS</span>
        </h1>
        <MobileSidebar
          groups={navigation}
          footerGroups={FOOTER_NAV_GROUPS}
          userEmail={userEmail}
          userRole={userRole}
        />
      </header>

      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside className="hidden w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        {/* Brand */}
        <div className="border-b border-sidebar-border px-6 py-5">
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-sidebar-foreground">SAIREX</span>{" "}
            <span className="text-sidebar-primary">SMS</span>
          </h1>
          <p className="mt-0.5 text-xs text-sidebar-foreground/50">
            {userRole} Console
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <SidebarNav groups={navigation} />
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
        </div>
      </aside>

      {/* ── Main content area ───────────────────────────────── */}
      <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
