import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVerifiedAuth } from "@/lib/auth-guard";

/**
 * GET /api/onboarding/status
 *
 * Returns the current onboarding step and next URL for the authenticated user.
 * Uses the Organization.onboardingStep to determine wizard progress.
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
          include: { organization: true },
          take: 1,
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { step: "NO_ACCOUNT", nextUrl: "/signup" },
      );
    }

    if (!user.emailVerifiedAt && !user.platformRole) {
      return NextResponse.json(
        { step: "UNVERIFIED", nextUrl: "/verify-email" },
      );
    }

    const membership = user.memberships[0];

    // No org yet → start identity step
    if (!membership) {
      return NextResponse.json(
        { step: "NO_ORG", nextUrl: "/onboarding/identity" },
      );
    }

    const org = membership.organization;

    // Map onboardingStep to the NEXT page the user should visit
    switch (org.onboardingStep) {
      case "ORG_IDENTITY":
        return NextResponse.json({
          step: "ORG_IDENTITY",
          nextUrl: "/onboarding/legal",
          organizationId: org.id,
        });
      case "LEGAL":
        return NextResponse.json({
          step: "LEGAL",
          nextUrl: "/onboarding/contact-address",
          organizationId: org.id,
        });
      case "CONTACT_ADDRESS":
        return NextResponse.json({
          step: "CONTACT_ADDRESS",
          nextUrl: "/onboarding/branding",
          organizationId: org.id,
        });
      case "BRANDING":
      case "COMPLETED":
        return NextResponse.json({
          step: "COMPLETED",
          nextUrl: "/admin/dashboard",
          organizationId: org.id,
        });
      default:
        return NextResponse.json({
          step: org.onboardingStep,
          nextUrl: "/onboarding/identity",
          organizationId: org.id,
        });
    }
  } catch (error) {
    console.error("Onboarding status error:", error);
    return NextResponse.json(
      { error: "Failed to check onboarding status" },
      { status: 500 },
    );
  }
}
