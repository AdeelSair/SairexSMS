import { z } from "zod";

// ─── Shared Constants ────────────────────────────────────────────────────────

const IANA_TIMEZONES = [
  "Asia/Karachi", "Asia/Kolkata", "Asia/Dubai", "Asia/Riyadh",
  "Asia/Shanghai", "Asia/Tokyo", "Asia/Singapore",
  "Europe/London", "Europe/Paris", "Europe/Berlin",
  "America/New_York", "America/Chicago", "America/Los_Angeles",
  "America/Toronto", "Australia/Sydney", "Pacific/Auckland",
  "UTC",
] as const;

const ORGANIZATION_TYPE = ["SCHOOL", "COLLEGE", "UNIVERSITY", "COMPANY", "NGO", "OTHER"] as const;
const ORGANIZATION_STATUS = ["ACTIVE", "PENDING", "SUSPENDED"] as const;

// ─── Normalization Helpers ───────────────────────────────────────────────────

/** Trim, collapse double spaces */
function normalizeString(val: string): string {
  return val.trim().replace(/\s{2,}/g, " ");
}

/** Generate slug from a name: lowercase, replace spaces/special chars with hyphens */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── Organization: CREATE Schema ─────────────────────────────────────────────

export const createOrganizationSchema = z
  .object({
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

    slug: z
      .string()
      .min(3, "Slug must be at least 3 characters")
      .max(60, "Slug must not exceed 60 characters")
      .regex(
        /^[a-z0-9]+(-[a-z0-9]+)*$/,
        "Slug must start and end with a letter or number, hyphens only between segments (e.g., my-school-1)"
      )
      .optional()
      .or(z.literal(""))
      .default(""),

    organizationType: z.enum(ORGANIZATION_TYPE, {
      message: "Organization type must be one of: SCHOOL, COLLEGE, UNIVERSITY, COMPANY, NGO, OTHER",
    }),

    registrationNumber: z
      .string()
      .min(5, "Registration number must be at least 5 characters")
      .max(30, "Registration number must not exceed 30 characters")
      .regex(/^[a-zA-Z0-9]+$/, "Registration number must be alphanumeric")
      .optional()
      .or(z.literal("")),

    taxNumber: z
      .string()
      .min(7, "Tax number must be at least 7 characters")
      .max(15, "Tax number must not exceed 15 characters")
      .regex(/^[a-zA-Z0-9\-]+$/, "Tax number must be alphanumeric (hyphens allowed)")
      .optional()
      .or(z.literal("")),

    logoUrl: z
      .string()
      .url("Logo must be a valid URL")
      .regex(/^https:\/\//, "Logo URL must use HTTPS")
      .optional()
      .or(z.literal("")),

    websiteUrl: z
      .string()
      .url("Website must be a valid URL")
      .regex(/^https?:\/\//, "Website URL must include protocol (http:// or https://)")
      .optional()
      .or(z.literal("")),

    timeZone: z
      .string()
      .refine((val) => IANA_TIMEZONES.includes(val as typeof IANA_TIMEZONES[number]), {
        message: "Must be a valid IANA timezone (e.g., Asia/Karachi)",
      })
      .default("Asia/Karachi"),

    defaultLanguage: z
      .string()
      .min(2, "Language code must be at least 2 characters")
      .max(5, "Language code must not exceed 5 characters")
      .regex(/^[a-z]+$/, "Language code must be lowercase (e.g., en, ur)")
      .default("en"),

    status: z.enum(ORGANIZATION_STATUS, {
      message: "Status must be one of: ACTIVE, PENDING, SUSPENDED",
    }).default("PENDING"),
  })
  .transform((data) => {
    const autoSlug = data.slug || slugify(data.organizationName);
    return {
      ...data,
      slug: autoSlug.length >= 3 ? autoSlug : `org-${Date.now().toString(36)}`,
      registrationNumber: data.registrationNumber || undefined,
      taxNumber: data.taxNumber || undefined,
      logoUrl: data.logoUrl || undefined,
      websiteUrl: data.websiteUrl || undefined,
    };
  });

// ─── Organization: UPDATE Schema (all fields optional) ───────────────────────

export const updateOrganizationSchema = z
  .object({
    organizationName: z
      .string()
      .min(3, "Organization name must be at least 3 characters")
      .max(150, "Organization name must not exceed 150 characters")
      .regex(
        /^[a-zA-Z0-9\s.&\-]+$/,
        "Organization name may only contain letters, numbers, spaces, periods, ampersands, and hyphens"
      )
      .transform(normalizeString)
      .optional(),

    displayName: z
      .string()
      .min(2, "Display name must be at least 2 characters")
      .max(100, "Display name must not exceed 100 characters")
      .transform(normalizeString)
      .optional(),

    slug: z
      .string()
      .min(3, "Slug must be at least 3 characters")
      .max(60, "Slug must not exceed 60 characters")
      .regex(
        /^[a-z0-9]+(-[a-z0-9]+)*$/,
        "Slug must start and end with a letter or number, hyphens only between segments (e.g., my-school-1)"
      )
      .optional(),

    organizationType: z.enum(ORGANIZATION_TYPE, {
      message: "Organization type must be one of: SCHOOL, COLLEGE, UNIVERSITY, COMPANY, NGO, OTHER",
    }).optional(),

    registrationNumber: z
      .string()
      .min(5, "Registration number must be at least 5 characters")
      .max(30, "Registration number must not exceed 30 characters")
      .regex(/^[a-zA-Z0-9]+$/, "Registration number must be alphanumeric")
      .optional()
      .or(z.literal(""))
      .transform((val) => val || undefined),

    taxNumber: z
      .string()
      .min(7, "Tax number must be at least 7 characters")
      .max(15, "Tax number must not exceed 15 characters")
      .regex(/^[a-zA-Z0-9\-]+$/, "Tax number must be alphanumeric (hyphens allowed)")
      .optional()
      .or(z.literal(""))
      .transform((val) => val || undefined),

    logoUrl: z
      .string()
      .url("Logo must be a valid URL")
      .regex(/^https:\/\//, "Logo URL must use HTTPS")
      .optional()
      .or(z.literal(""))
      .transform((val) => val || undefined),

    websiteUrl: z
      .string()
      .url("Website must be a valid URL")
      .regex(/^https?:\/\//, "Website URL must include protocol (http:// or https://)")
      .optional()
      .or(z.literal(""))
      .transform((val) => val || undefined),

    timeZone: z
      .string()
      .refine((val) => IANA_TIMEZONES.includes(val as typeof IANA_TIMEZONES[number]), {
        message: "Must be a valid IANA timezone (e.g., Asia/Karachi)",
      })
      .optional(),

    defaultLanguage: z
      .string()
      .min(2, "Language code must be at least 2 characters")
      .max(5, "Language code must not exceed 5 characters")
      .regex(/^[a-z]+$/, "Language code must be lowercase (e.g., en, ur)")
      .optional(),

    status: z.enum(ORGANIZATION_STATUS, {
      message: "Status must be one of: ACTIVE, PENDING, SUSPENDED",
    }).optional(),
  });

// ─── Type Exports ────────────────────────────────────────────────────────────

export type CreateOrganizationInput = z.input<typeof createOrganizationSchema>;
export type CreateOrganizationData = z.output<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.input<typeof updateOrganizationSchema>;
export type UpdateOrganizationData = z.output<typeof updateOrganizationSchema>;

// Re-export constants for use in UI dropdowns
export { ORGANIZATION_TYPE, ORGANIZATION_STATUS, IANA_TIMEZONES };
