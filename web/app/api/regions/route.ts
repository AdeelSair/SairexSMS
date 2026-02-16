import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { scopeFilter, resolveOrgId } from "@/lib/tenant";

// 1. GET: Fetch regional offices (tenant-scoped)
export async function GET() {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  try {
    const where = scopeFilter(guard);

    const regions = await prisma.regionalOffice.findMany({
      where,
      include: { organization: true },
    });
    return NextResponse.json(regions);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch regions" },
      { status: 500 }
    );
  }
}

// 2. POST: Create a regional office (tenant-scoped)
export async function POST(request: Request) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  try {
    const body = await request.json();

    // Enforce tenant boundary: use session orgId unless SUPER_ADMIN overrides
    const orgId = resolveOrgId(guard, body.organizationId);

    const region = await prisma.regionalOffice.create({
      data: {
        name: body.name,
        city: body.city,
        organizationId: orgId,
      },
    });
    return NextResponse.json(region, { status: 201 });
  } catch (error) {
    console.error("Region creation error:", error);
    return NextResponse.json(
      { error: "Failed to create region" },
      { status: 500 }
    );
  }
}
