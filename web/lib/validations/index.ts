// ─── Organization Validation Schemas ─────────────────────────────────────────

// Organization
export {
  createOrganizationSchema,
  updateOrganizationSchema,
  ORGANIZATION_TYPE,
  ORGANIZATION_STATUS,
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

// Signup / Register
export {
  signupSchema,
  type SignupInput,
  type SignupData,
} from "./signup";

// Onboarding (4-step wizard)
export {
  onboardingIdentitySchema,
  onboardingLegalSchema,
  onboardingContactAddressSchema,
  onboardingBrandingSchema,
  ONBOARDING_ORGANIZATION_TYPE,
  type OnboardingIdentityInput,
  type OnboardingIdentityData,
  type OnboardingLegalInput,
  type OnboardingLegalData,
  type OnboardingContactAddressInput,
  type OnboardingContactAddressData,
  type OnboardingBrandingInput,
  type OnboardingBrandingData,
} from "./onboarding";
