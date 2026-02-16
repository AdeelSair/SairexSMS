import { z } from "zod";

// ─── Shared Constants ────────────────────────────────────────────────────────

const ADDRESS_TYPE = ["HEAD_OFFICE", "BILLING", "BRANCH"] as const;

/** Pakistan provinces/territories — used for validation when country is PK */
const PAKISTAN_PROVINCES = [
  "Punjab",
  "Sindh",
  "KPK",
  "Balochistan",
  "Islamabad Capital Territory",
  "Gilgit-Baltistan",
  "AJK",
] as const;

// ─── Normalization Helpers ───────────────────────────────────────────────────

function normalizeString(val: string): string {
  return val.trim().replace(/\s{2,}/g, " ");
}

// ─── OrganizationAddress: CREATE Schema ──────────────────────────────────────

export const createOrganizationAddressSchema = z
  .object({
    organizationId: z
      .string()
      .min(1, "Organization ID is required")
      .max(11)
      .regex(/^ORG-\d{5}$/, "Organization ID must be in format ORG-00001"),

    addressType: z.enum(ADDRESS_TYPE, {
      message: "Address type must be one of: HEAD_OFFICE, BILLING, BRANCH",
    }),

    country: z
      .string()
      .length(2, "Country must be a 2-letter ISO-3166-1 alpha-2 code")
      .regex(/^[A-Z]{2}$/, "Country code must be uppercase (e.g., PK, US, AE)")
      .default("PK"),

    provinceState: z
      .string()
      .min(2, "Province/State must be at least 2 characters")
      .max(100, "Province/State must not exceed 100 characters")
      .transform(normalizeString),

    city: z
      .string()
      .min(2, "City must be at least 2 characters")
      .max(100, "City must not exceed 100 characters")
      .transform(normalizeString),

    areaLocality: z
      .string()
      .min(2, "Area/Locality must be at least 2 characters")
      .max(120, "Area/Locality must not exceed 120 characters")
      .transform(normalizeString)
      .optional()
      .or(z.literal("")),

    postalCode: z
      .string()
      .min(3, "Postal code must be at least 3 characters")
      .max(12, "Postal code must not exceed 12 characters")
      .regex(/^[a-zA-Z0-9\s-]+$/, "Postal code must be alphanumeric")
      .optional()
      .or(z.literal("")),

    addressLine1: z
      .string()
      .min(5, "Address line 1 must be at least 5 characters")
      .max(150, "Address line 1 must not exceed 150 characters")
      .transform(normalizeString),

    addressLine2: z
      .string()
      .min(2, "Address line 2 must be at least 2 characters")
      .max(150, "Address line 2 must not exceed 150 characters")
      .transform(normalizeString)
      .optional()
      .or(z.literal("")),

    latitude: z
      .number()
      .min(-90, "Latitude must be between -90 and +90")
      .max(90, "Latitude must be between -90 and +90")
      .optional(),

    longitude: z
      .number()
      .min(-180, "Longitude must be between -180 and +180")
      .max(180, "Longitude must be between -180 and +180")
      .optional(),

    isPrimary: z.boolean({
      message: "isPrimary is required and must be true or false",
    }),
  })
  // Cross-field: if country is PK, provinceState must be from the predefined list
  .refine(
    (data) => {
      if (data.country !== "PK") return true;
      return PAKISTAN_PROVINCES.includes(data.provinceState as typeof PAKISTAN_PROVINCES[number]);
    },
    {
      message: `For Pakistan (PK), province must be one of: ${PAKISTAN_PROVINCES.join(", ")}`,
      path: ["provinceState"],
    }
  )
  // Normalize empty optional strings to undefined
  .transform((data) => ({
    ...data,
    areaLocality: data.areaLocality || undefined,
    postalCode: data.postalCode || undefined,
    addressLine2: data.addressLine2 || undefined,
  }));

// ─── OrganizationAddress: UPDATE Schema ──────────────────────────────────────

export const updateOrganizationAddressSchema = z
  .object({
    addressType: z.enum(ADDRESS_TYPE, {
      message: "Address type must be one of: HEAD_OFFICE, BILLING, BRANCH",
    }).optional(),

    country: z
      .string()
      .length(2, "Country must be a 2-letter ISO-3166-1 alpha-2 code")
      .regex(/^[A-Z]{2}$/, "Country code must be uppercase (e.g., PK, US, AE)")
      .optional(),

    provinceState: z
      .string()
      .min(2, "Province/State must be at least 2 characters")
      .max(100, "Province/State must not exceed 100 characters")
      .transform(normalizeString)
      .optional(),

    city: z
      .string()
      .min(2, "City must be at least 2 characters")
      .max(100, "City must not exceed 100 characters")
      .transform(normalizeString)
      .optional(),

    areaLocality: z
      .string()
      .min(2, "Area/Locality must be at least 2 characters")
      .max(120, "Area/Locality must not exceed 120 characters")
      .transform(normalizeString)
      .optional()
      .or(z.literal("")),

    postalCode: z
      .string()
      .min(3, "Postal code must be at least 3 characters")
      .max(12, "Postal code must not exceed 12 characters")
      .regex(/^[a-zA-Z0-9\s-]+$/, "Postal code must be alphanumeric")
      .optional()
      .or(z.literal("")),

    addressLine1: z
      .string()
      .min(5, "Address line 1 must be at least 5 characters")
      .max(150, "Address line 1 must not exceed 150 characters")
      .transform(normalizeString)
      .optional(),

    addressLine2: z
      .string()
      .min(2, "Address line 2 must be at least 2 characters")
      .max(150, "Address line 2 must not exceed 150 characters")
      .transform(normalizeString)
      .optional()
      .or(z.literal("")),

    latitude: z
      .number()
      .min(-90, "Latitude must be between -90 and +90")
      .max(90, "Latitude must be between -90 and +90")
      .optional(),

    longitude: z
      .number()
      .min(-180, "Longitude must be between -180 and +180")
      .max(180, "Longitude must be between -180 and +180")
      .optional(),

    isPrimary: z.boolean().optional(),
  })
  // Cross-field: if country is PK and provinceState provided, validate against list
  .refine(
    (data) => {
      if (!data.country || data.country !== "PK") return true;
      if (!data.provinceState) return true;
      return PAKISTAN_PROVINCES.includes(data.provinceState as typeof PAKISTAN_PROVINCES[number]);
    },
    {
      message: `For Pakistan (PK), province must be one of: ${PAKISTAN_PROVINCES.join(", ")}`,
      path: ["provinceState"],
    }
  )
  .transform((data) => ({
    ...data,
    areaLocality: data.areaLocality || undefined,
    postalCode: data.postalCode || undefined,
    addressLine2: data.addressLine2 || undefined,
  }));

// ─── Type Exports ────────────────────────────────────────────────────────────

export type CreateOrganizationAddressInput = z.input<typeof createOrganizationAddressSchema>;
export type CreateOrganizationAddressData = z.output<typeof createOrganizationAddressSchema>;
export type UpdateOrganizationAddressInput = z.input<typeof updateOrganizationAddressSchema>;
export type UpdateOrganizationAddressData = z.output<typeof updateOrganizationAddressSchema>;

// Re-export constants for use in UI dropdowns
export { ADDRESS_TYPE, PAKISTAN_PROVINCES };
