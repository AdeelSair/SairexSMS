export type TenantThemeInput = {
  primaryColor?: string | null;
  accentColor?: string | null;
  primaryForeground?: string | null;
};

export function applyTenantTheme(tenant: TenantThemeInput | null | undefined) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.style.setProperty("--tenant-primary", tenant?.primaryColor || "var(--sx-primary)");
  root.style.setProperty("--tenant-accent", tenant?.accentColor || "var(--sx-accent)");
  root.style.setProperty(
    "--tenant-primary-foreground",
    tenant?.primaryForeground || "var(--sx-primary-foreground)",
  );
}

