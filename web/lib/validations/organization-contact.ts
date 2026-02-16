import { z } from "zod";

// ─── Shared Constants ────────────────────────────────────────────────────────

/** E.164 phone format: +{country code}{number}, 8-15 digits total after + */
const E164_REGEX = /^\+[1-9]\d{7,14}$/;

// ─── Normalization Helpers ───────────────────────────────────────────────────

function normalizeString(val: string): string {
  return val.trim().replace(/\s{2,}/g, " ");
}

function normalizeEmail(val: string): string {
  return val.trim().toLowerCase();
}

// ─── Base field schemas (reused in create & update) ──────────────────────────

const contactNameField = z
  .string()
  .min(3, "Contact name must be at least 3 characters")
  .max(120, "Contact name must not exceed 120 characters")
  .regex(/^[a-zA-Z\s.]+$/, "Contact name may only contain letters, spaces, and periods")
  .transform(normalizeString);

const designationField = z
  .string()
  .min(2, "Designation must be at least 2 characters")
  .max(100, "Designation must not exceed 100 characters")
  .transform(normalizeString);

const phoneField = z
  .string()
  .regex(E164_REGEX, "Phone must be in E.164 format (e.g., +923001234567)");

const emailField = z
  .string()
  .trim()
  .email("Must be a valid email address")
  .max(255, "Email must not exceed 255 characters")
  .transform(normalizeEmail);

// ─── OrganizationContact: CREATE Schema ──────────────────────────────────────

export const createOrganizationContactSchema = z
  .object({
    organizationId: z
      .string()
      .min(1, "Organization ID is required")
      .max(11)
      .regex(/^ORG-\d{5}$/, "Organization ID must be in format ORG-00001"),

    contactName: contactNameField,

    designation: designationField.optional(),

    primaryPhone: phoneField,

    secondaryPhone: phoneField.optional().or(z.literal("")),

    whatsappNumber: phoneField.optional().or(z.literal("")),

    primaryEmail: emailField,

    billingEmail: emailField.optional().or(z.literal("")),

    supportEmail: emailField.optional().or(z.literal("")),

    isPrimary: z.boolean({
      message: "isPrimary is required and must be true or false",
    }),
  })
  // Cross-field: secondary phone must differ from primary
  .refine(
    (data) => {
      if (!data.secondaryPhone || data.secondaryPhone === "") return true;
      return data.secondaryPhone !== data.primaryPhone;
    },
    {
      message: "Secondary phone must be different from primary phone",
      path: ["secondaryPhone"],
    }
  )
  // Normalize empty optional strings to undefined
  .transform((data) => ({
    ...data,
    secondaryPhone: data.secondaryPhone || undefined,
    whatsappNumber: data.whatsappNumber || undefined,
    billingEmail: data.billingEmail || undefined,
    supportEmail: data.supportEmail || undefined,
    designation: data.designation || undefined,
  }));

// ─── OrganizationContact: UPDATE Schema ──────────────────────────────────────

export const updateOrganizationContactSchema = z
  .object({
    contactName: contactNameField.optional(),

    designation: designationField.optional().or(z.literal("")),

    primaryPhone: phoneField.optional(),

    secondaryPhone: phoneField.optional().or(z.literal("")),

    whatsappNumber: phoneField.optional().or(z.literal("")),

    primaryEmail: emailField.optional(),

    billingEmail: emailField.optional().or(z.literal("")),

    supportEmail: emailField.optional().or(z.literal("")),

    isPrimary: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (!data.secondaryPhone || data.secondaryPhone === "") return true;
      if (!data.primaryPhone) return true; // can't compare if primary not provided
      return data.secondaryPhone !== data.primaryPhone;
    },
    {
      message: "Secondary phone must be different from primary phone",
      path: ["secondaryPhone"],
    }
  )
  .transform((data) => ({
    ...data,
    secondaryPhone: data.secondaryPhone || undefined,
    whatsappNumber: data.whatsappNumber || undefined,
    billingEmail: data.billingEmail || undefined,
    supportEmail: data.supportEmail || undefined,
    designation: data.designation || undefined,
  }));

// ─── Type Exports ────────────────────────────────────────────────────────────

export type CreateOrganizationContactInput = z.input<typeof createOrganizationContactSchema>;
export type CreateOrganizationContactData = z.output<typeof createOrganizationContactSchema>;
export type UpdateOrganizationContactInput = z.input<typeof updateOrganizationContactSchema>;
export type UpdateOrganizationContactData = z.output<typeof updateOrganizationContactSchema>;
