import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVerifiedAuth } from "@/lib/auth-guard";

/**
 * GET /api/onboarding/status
 *
 * Returns the current onboarding step and next URL for the authenticated user.
 * Used by the onboarding layout to redirect to the correct step.
 */
export async function GET() {
  const guard = await requireVerifiedAuth();
  if (guard instanceof NextResponse) return guard;

  try {
    const user = await prisma.user.findUnique({
      where: { id: guard.id },
      include: {
        memberships: {
          where: { status: "ACTIVE" },
          include: {
            organization: {
              include: {
                contacts: { where: { isPrimary: true }, take: 1 },
                addresses: { where: { isPrimary: true }, take: 1 },
              },
            },
          },
          take: 1,
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { step: "ACCOUNT_CREATED", nextUrl: "/signup" },
      );
    }

    if (!user.emailVerifiedAt && !user.platformRole) {
      return NextResponse.json(
        { step: "ACCOUNT_CREATED", nextUrl: "/verify-email" },
      );
    }

    const membership = user.memberships[0];

    if (!membership) {
      return NextResponse.json(
        { step: "EMAIL_VERIFIED", nextUrl: "/onboarding/organization" },
      );
    }

    const org = membership.organization;
    const hasContact = org.contacts.length > 0;
    const hasAddress = org.addresses.length > 0;

    if (!hasContact) {
      return NextResponse.json({
        step: "ORG_CREATED",
        nextUrl: "/onboarding/contact",
        organizationId: org.id,
      });
    }

    if (!hasAddress) {
      return NextResponse.json({
        step: "ORG_CREATED",
        nextUrl: "/onboarding/address",
        organizationId: org.id,
      });
    }

    if (org.status !== "ACTIVE" || org.onboardingStep !== "COMPLETED") {
      return NextResponse.json({
        step: "PROFILE_COMPLETED",
        nextUrl: "/onboarding/complete",
        organizationId: org.id,
      });
    }

    return NextResponse.json({
      step: "COMPLETED",
      nextUrl: "/admin/dashboard",
      organizationId: org.id,
    });
  } catch (error) {
    console.error("Onboarding status error:", error);
    return NextResponse.json(
      { error: "Failed to check onboarding status" },
      { status: 500 },
    );
  }
}
