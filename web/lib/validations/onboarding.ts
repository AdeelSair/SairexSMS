import { z } from "zod";

// ─── Constants ───────────────────────────────────────────────────────────────

const ORGANIZATION_TYPE = ["SCHOOL", "COLLEGE", "UNIVERSITY", "ACADEMY", "NGO", "OTHER"] as const;

// ─── Normalization ───────────────────────────────────────────────────────────

function normalizeString(val: string): string {
  return val.trim().replace(/\s{2,}/g, " ");
}

// ─── Step 1: Organization Creation ───────────────────────────────────────────

export const onboardingOrganizationSchema = z.object({
  organizationName: z
    .string()
    .min(3, "Organization name must be at least 3 characters")
    .max(150, "Organization name must not exceed 150 characters")
    .regex(
      /^[a-zA-Z0-9\s.&\-]+$/,
      "Organization name may only contain letters, numbers, spaces, periods, ampersands, and hyphens"
    )
    .transform(normalizeString),

  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(100, "Display name must not exceed 100 characters")
    .transform(normalizeString),

  organizationType: z.enum(ORGANIZATION_TYPE, {
    message: "Organization type must be one of: SCHOOL, COLLEGE, UNIVERSITY, ACADEMY, NGO, OTHER",
  }),

  timeZone: z
    .string()
    .min(1)
    .default("Asia/Karachi"),

  defaultLanguage: z
    .string()
    .min(2)
    .max(5)
    .default("en"),
});

export type OnboardingOrganizationInput = z.input<typeof onboardingOrganizationSchema>;
export type OnboardingOrganizationData = z.output<typeof onboardingOrganizationSchema>;

// ─── Step 2: Primary Contact ─────────────────────────────────────────────────

export const onboardingContactSchema = z.object({
  name: z
    .string()
    .min(3, "Contact name must be at least 3 characters")
    .max(120, "Contact name must not exceed 120 characters")
    .transform(normalizeString),

  designation: z
    .string()
    .min(2, "Designation must be at least 2 characters")
    .max(100, "Designation must not exceed 100 characters")
    .transform(normalizeString)
    .optional()
    .or(z.literal("")),

  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^\+[1-9]\d{7,14}$/, "Phone must be in E.164 format (e.g., +923001234567)"),

  email: z
    .string()
    .email("Must be a valid email address")
    .transform((v) => v.toLowerCase().trim()),
});

export type OnboardingContactInput = z.input<typeof onboardingContactSchema>;
export type OnboardingContactData = z.output<typeof onboardingContactSchema>;

// ─── Step 3: Primary Address ─────────────────────────────────────────────────

export const onboardingAddressSchema = z.object({
  country: z
    .string()
    .min(2, "Country is required")
    .max(100)
    .transform(normalizeString),

  province: z
    .string()
    .min(2, "Province/State is required")
    .max(100)
    .transform(normalizeString),

  city: z
    .string()
    .min(2, "City is required")
    .max(100)
    .transform(normalizeString),

  addressLine1: z
    .string()
    .min(5, "Address must be at least 5 characters")
    .max(150)
    .transform(normalizeString),

  postalCode: z
    .string()
    .min(3, "Postal code must be at least 3 characters")
    .max(12)
    .optional()
    .or(z.literal("")),
});

export type OnboardingAddressInput = z.input<typeof onboardingAddressSchema>;
export type OnboardingAddressData = z.output<typeof onboardingAddressSchema>;

// Re-export constants
export { ORGANIZATION_TYPE as ONBOARDING_ORGANIZATION_TYPE };
