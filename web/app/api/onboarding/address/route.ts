import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVerifiedAuth } from "@/lib/auth-guard";
import { onboardingAddressSchema } from "@/lib/validations/onboarding";

/**
 * POST /api/onboarding/address
 *
 * Creates the primary head office address for the user's organization.
 */
export async function POST(request: Request) {
  const guard = await requireVerifiedAuth();
  if (guard instanceof NextResponse) return guard;

  try {
    const membership = await prisma.membership.findFirst({
      where: { userId: guard.id, status: "ACTIVE" },
      include: { organization: true },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "You need to create an organization first." },
        { status: 400 },
      );
    }

    const orgId = membership.organizationId;

    // Check if primary address already exists
    const existing = await prisma.organizationAddress.findFirst({
      where: { organizationId: orgId, isPrimary: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Primary address already exists. Proceed to complete onboarding." },
        { status: 409 },
      );
    }

    const body = await request.json();
    const parsed = onboardingAddressSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    await prisma.organizationAddress.create({
      data: {
        organizationId: orgId,
        type: "HEAD_OFFICE",
        country: parsed.data.country,
        province: parsed.data.province,
        city: parsed.data.city,
        addressLine1: parsed.data.addressLine1,
        postalCode: parsed.data.postalCode || undefined,
        isPrimary: true,
      },
    });

    return NextResponse.json(
      {
        message: "Primary address added",
        nextUrl: "/onboarding/complete",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Onboarding address error:", error);
    return NextResponse.json(
      { error: "Failed to add address" },
      { status: 500 },
    );
  }
}
