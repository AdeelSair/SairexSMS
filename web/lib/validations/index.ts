// ─── Organization Validation Schemas ─────────────────────────────────────────
// Centralized Zod validation for the Organization module.
// Usage:
//   import { createOrganizationSchema, PAKISTAN_PROVINCES } from "@/lib/validations";
//
//   const result = createOrganizationSchema.safeParse(requestBody);
//   if (!result.success) {
//     return NextResponse.json({ errors: result.error.flatten().fieldErrors }, { status: 400 });
//   }
//   const validData = result.data;

// Organization
export {
  createOrganizationSchema,
  updateOrganizationSchema,
  ORGANIZATION_TYPE,
  ORGANIZATION_STATUS,
  IANA_TIMEZONES,
  type CreateOrganizationInput,
  type CreateOrganizationData,
  type UpdateOrganizationInput,
  type UpdateOrganizationData,
} from "./organization";

// Organization Contact
export {
  createOrganizationContactSchema,
  updateOrganizationContactSchema,
  type CreateOrganizationContactInput,
  type CreateOrganizationContactData,
  type UpdateOrganizationContactInput,
  type UpdateOrganizationContactData,
} from "./organization-contact";

// Organization Address
export {
  createOrganizationAddressSchema,
  updateOrganizationAddressSchema,
  ADDRESS_TYPE,
  PAKISTAN_PROVINCES,
  type CreateOrganizationAddressInput,
  type CreateOrganizationAddressData,
  type UpdateOrganizationAddressInput,
  type UpdateOrganizationAddressData,
} from "./organization-address";
