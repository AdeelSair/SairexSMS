import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVerifiedAuth } from "@/lib/auth-guard";
import { generateOrganizationId } from "@/lib/id-generators";
import { onboardingCompleteSchema } from "@/lib/validations/onboarding";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * POST /api/onboarding/complete
 *
 * Unified endpoint: validates ALL onboarding data, generates the
 * Organization ID, and creates the Organization + Membership in a
 * single transaction. Nothing is persisted until this call.
 */
export async function POST(request: Request) {
  const guard = await requireVerifiedAuth();
  if (guard instanceof NextResponse) return guard;

  try {
    const existingMembership = await prisma.membership.findFirst({
      where: { userId: guard.id, status: "ACTIVE" },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: "You already have an organization." },
        { status: 409 },
      );
    }

    const body = await request.json();
    const parsed = onboardingCompleteSchema.safeParse(body);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      return NextResponse.json({ errors: fieldErrors }, { status: 400 });
    }

    const { identity, legal, contactAddress, branding } = parsed.data;

    const slug = slugify(identity.displayName);
    const finalSlug = slug.length >= 3 ? slug : `org-${Date.now().toString(36)}`;

    const existingSlug = await prisma.organization.findUnique({
      where: { slug: finalSlug },
    });

    if (existingSlug) {
      return NextResponse.json(
        {
          errors: {
            "identity.organizationName": [
              "An organization with a similar name already exists",
            ],
          },
        },
        { status: 409 },
      );
    }

    const orgId = await generateOrganizationId();

    const org = await prisma.$transaction(async (tx) => {
      const created = await tx.organization.create({
        data: {
          id: orgId,
          slug: finalSlug,
          status: "ACTIVE",
          onboardingStep: "COMPLETED",
          createdByUserId: guard.id,

          organizationName: identity.organizationName,
          displayName: identity.displayName,
          organizationCategory: identity.organizationCategory,
          organizationStructure: identity.organizationStructure,

          registrationNumber: legal.registrationNumber,
          taxNumber: legal.taxNumber,
          establishedDate: new Date(legal.establishedDate),

          addressLine1: contactAddress.addressLine1,
          addressLine2: contactAddress.addressLine2 || null,
          country: contactAddress.country,
          provinceState: contactAddress.provinceState,
          city: contactAddress.city,
          postalCode: contactAddress.postalCode || null,
          organizationEmail: contactAddress.organizationEmail,
          organizationPhone: contactAddress.organizationPhone,
          organizationWhatsApp: contactAddress.organizationWhatsApp || null,
          websiteUrl: contactAddress.websiteUrl || null,

          logoUrl: branding.logoUrl || null,
        },
      });

      await tx.membership.create({
        data: {
          userId: guard.id,
          organizationId: created.id,
          role: "ORG_ADMIN",
          status: "ACTIVE",
        },
      });

      return created;
    });

    return NextResponse.json(org, { status: 201 });
  } catch (error) {
    console.error("Onboarding complete error:", error);
    return NextResponse.json(
      { error: "Failed to complete onboarding" },
      { status: 500 },
    );
  }
}
