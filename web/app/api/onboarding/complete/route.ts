import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVerifiedAuth } from "@/lib/auth-guard";

/**
 * POST /api/onboarding/complete
 *
 * Final activation check. Verifies the org has a primary contact and address,
 * then sets org.status = ACTIVE and onboardingStep = COMPLETED.
 */
export async function POST() {
  const guard = await requireVerifiedAuth();
  if (guard instanceof NextResponse) return guard;

  try {
    const membership = await prisma.membership.findFirst({
      where: { userId: guard.id, status: "ACTIVE" },
      include: {
        organization: {
          include: {
            contacts: { where: { isPrimary: true }, take: 1 },
            addresses: { where: { isPrimary: true }, take: 1 },
          },
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "No organization found." },
        { status: 400 },
      );
    }

    const org = membership.organization;

    if (org.contacts.length === 0) {
      return NextResponse.json(
        { error: "Please add a primary contact first.", nextUrl: "/onboarding/contact" },
        { status: 400 },
      );
    }

    if (org.addresses.length === 0) {
      return NextResponse.json(
        { error: "Please add a primary address first.", nextUrl: "/onboarding/address" },
        { status: 400 },
      );
    }

    if (org.status === "ACTIVE" && org.onboardingStep === "COMPLETED") {
      return NextResponse.json({
        message: "Onboarding already completed",
        nextUrl: "/admin/dashboard",
      });
    }

    await prisma.organization.update({
      where: { id: org.id },
      data: {
        status: "ACTIVE",
        onboardingStep: "COMPLETED",
      },
    });

    return NextResponse.json({
      message: "Onboarding completed! Your organization is now active.",
      nextUrl: "/admin/dashboard",
    });
  } catch (error) {
    console.error("Onboarding complete error:", error);
    return NextResponse.json(
      { error: "Failed to complete onboarding" },
      { status: 500 },
    );
  }
}
