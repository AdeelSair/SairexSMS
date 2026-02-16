/**
 * Multi-tenant theme utilities
 *
 * Allows organizations to override default CSS variables at runtime.
 * This is the foundation for white-labeling / per-org branding.
 */

export interface OrganizationTheme {
  /** Primary brand color (CSS color value) */
  primary?: string;
  /** Primary foreground (text on primary) */
  primaryForeground?: string;
  /** Sidebar background */
  sidebar?: string;
  /** Sidebar foreground */
  sidebarForeground?: string;
  /** Logo URL override */
  logoUrl?: string;
  /** Border radius override */
  radius?: string;
}

/**
 * Apply organization theme overrides to the document root.
 * Call this after loading org settings from the database.
 *
 * Usage:
 * ```ts
 * const orgTheme = await fetchOrgTheme(organizationId);
 * setCSSVariablesFromDB(orgTheme);
 * ```
 */
export function setCSSVariablesFromDB(theme: OrganizationTheme): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  const mappings: [keyof OrganizationTheme, string][] = [
    ["primary", "--primary"],
    ["primaryForeground", "--primary-foreground"],
    ["sidebar", "--sidebar"],
    ["sidebarForeground", "--sidebar-foreground"],
    ["radius", "--radius"],
  ];

  for (const [key, cssVar] of mappings) {
    const value = theme[key];
    if (value) {
      root.style.setProperty(cssVar, value);
    }
  }
}

/**
 * Remove all organization theme overrides, reverting to defaults.
 */
export function resetThemeOverrides(): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const vars = [
    "--primary",
    "--primary-foreground",
    "--sidebar",
    "--sidebar-foreground",
    "--radius",
  ];

  for (const v of vars) {
    root.style.removeProperty(v);
  }
}

/**
 * Convert a hex color to an OKLCH CSS value.
 * Useful when storing org colors as hex in the database
 * and needing to set them as OKLCH CSS variables.
 */
export function hexToOklchCss(hex: string): string {
  // Use CSS color-mix as a passthrough — modern browsers handle conversion
  return `oklch(from ${hex} l c h)`;
}
