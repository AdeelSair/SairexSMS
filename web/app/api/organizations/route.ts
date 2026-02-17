import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, isSuperAdmin } from "@/lib/auth-guard";
import { generateOrganizationId } from "@/lib/id-generators";
import { createOrganizationSchema } from "@/lib/validations";

export async function GET() {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  try {
    const where = isSuperAdmin(guard)
      ? {}
      : { id: guard.organizationId ?? undefined };

    const orgs = await prisma.organization.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(orgs);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch orgs" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  const denied = requireRole(guard, "SUPER_ADMIN");
  if (denied) return denied;

  try {
    const body = await request.json();

    const parsed = createOrganizationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const existingSlug = await prisma.organization.findUnique({
      where: { slug: parsed.data.slug },
    });
    if (existingSlug) {
      return NextResponse.json(
        { errors: { slug: ["This slug is already taken"] } },
        { status: 409 },
      );
    }

    const orgId = await generateOrganizationId();

    const newOrg = await prisma.organization.create({
      data: {
        id: orgId,
        createdByUserId: guard.id,
        organizationName: parsed.data.organizationName,
        displayName: parsed.data.displayName,
        slug: parsed.data.slug,
        organizationType: parsed.data.organizationType,
        status: parsed.data.status,
        onboardingStep: "COMPLETED",
      },
    });

    return NextResponse.json(newOrg, { status: 201 });
  } catch (error) {
    console.error("Failed to create org:", error);
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 },
    );
  }
}
