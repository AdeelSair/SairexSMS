/**
 * SAIREX Design Language — Theme Configuration
 *
 * Programmatic access to design tokens.
 * CSS variables are the source of truth (globals.css).
 * This file provides typed constants for use in JS/TS code.
 */

/* ── Brand ─────────────────────────────────────────────────── */
export const brand = {
  name: "SAIREX SMS",
  tagline: "Smart Management System",
  company: "Sairex Technologies",
} as const;

/* ── Color tokens (HSL references) ─────────────────────────── */
export const colors = {
  primary: "hsl(var(--primary))",
  background: "hsl(var(--background))",
  foreground: "hsl(var(--foreground))",
  card: "hsl(var(--card))",
  cardForeground: "hsl(var(--card-foreground))",
  muted: "hsl(var(--muted))",
  mutedForeground: "hsl(var(--muted-foreground))",
  destructive: "hsl(var(--destructive))",
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  info: "hsl(var(--info))",
} as const;

/* ── Fee status → CSS color variable mapping ───────────────── */
export const feeStatusColors = {
  PAID: "var(--fee-paid)",
  UNPAID: "var(--fee-unpaid)",
  PARTIALLY_PAID: "var(--fee-partial)",
  ADVANCE: "var(--fee-advance)",
  REFUND: "var(--fee-refund)",
} as const;

export type FeeStatus = keyof typeof feeStatusColors;

/* ── Typography ────────────────────────────────────────────── */
export const typography = {
  fontSans: "Inter",
  fontMono: "JetBrains Mono",
  scale: {
    pageTitle: "text-2xl",
    sectionTitle: "text-lg",
    cardTitle: "text-base",
    body: "text-sm",
    table: "text-sm",
    meta: "text-xs",
  },
} as const;

/* ── Spacing (ERP standard) ────────────────────────────────── */
export const spacing = {
  page: "1.5rem",    // 24px
  section: "1.5rem", // 24px
  card: "1rem",      // 16px
  form: "1rem",      // 16px
} as const;

/* ── Radius ────────────────────────────────────────────────── */
export const radius = "0.5rem"; // rounded-lg everywhere

/* ── Icon defaults ─────────────────────────────────────────── */
export const iconDefaults = {
  size: 18,
  strokeWidth: 2,
} as const;

/* ── Navigation structure ──────────────────────────────────── */
export interface NavItem {
  label: string;
  href: string;
  icon: string; // lucide icon name
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navigation: NavGroup[] = [
  {
    label: "",
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: "LayoutDashboard" },
    ],
  },
  {
    label: "Core Setup",
    items: [
      { label: "Organizations", href: "/admin/organizations", icon: "Building2" },
      { label: "Regional Offices", href: "/admin/regions", icon: "Map" },
      { label: "Campuses", href: "/admin/campuses", icon: "School" },
    ],
  },
  {
    label: "Management",
    items: [
      { label: "Students", href: "/admin/students", icon: "GraduationCap" },
      { label: "Fee Module", href: "/admin/finance", icon: "Wallet" },
    ],
  },
  {
    label: "Admin",
    items: [
      { label: "Users & Invites", href: "/admin/users", icon: "Users" },
    ],
  },
  {
    label: "Development",
    items: [
      { label: "Dev Tools", href: "/admin/dev-tools", icon: "Wrench" },
    ],
  },
];
