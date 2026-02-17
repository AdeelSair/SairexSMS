import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVerifiedAuth } from "@/lib/auth-guard";
import { onboardingContactSchema } from "@/lib/validations/onboarding";

/**
 * POST /api/onboarding/contact
 *
 * Creates the primary contact for the user's organization.
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

    // Check if primary contact already exists
    const existing = await prisma.organizationContact.findFirst({
      where: { organizationId: orgId, isPrimary: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Primary contact already exists. Proceed to the next step." },
        { status: 409 },
      );
    }

    const body = await request.json();
    const parsed = onboardingContactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    await prisma.organizationContact.create({
      data: {
        organizationId: orgId,
        name: parsed.data.name,
        designation: parsed.data.designation || undefined,
        phone: parsed.data.phone,
        email: parsed.data.email,
        isPrimary: true,
      },
    });

    return NextResponse.json(
      {
        message: "Primary contact added",
        nextUrl: "/onboarding/address",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Onboarding contact error:", error);
    return NextResponse.json(
      { error: "Failed to add contact" },
      { status: 500 },
    );
  }
}
