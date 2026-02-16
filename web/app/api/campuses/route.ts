import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { scopeFilter, resolveOrgId, validateCrossRefs } from "@/lib/tenant";

// 1. GET: Fetch campuses (tenant-scoped)
export async function GET() {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  try {
    const where = scopeFilter(guard);

    const campuses = await prisma.campus.findMany({
      where,
      include: { organization: true, region: true },
    });
    return NextResponse.json(campuses);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch campuses" },
      { status: 500 }
    );
  }
}

// 2. POST: Create a campus (tenant-scoped)
export async function POST(request: Request) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  try {
    const body = await request.json();

    const orgId = resolveOrgId(guard, body.organizationId);
    const regionId = body.regionId ? parseInt(body.regionId) : null;

    // Cross-reference validation: ensure region belongs to the same org
    if (regionId) {
      const crossRefError = await validateCrossRefs(orgId, [
        { model: "regionalOffice", id: regionId, label: "Regional Office" },
      ]);
      if (crossRefError) return crossRefError;
    }

    const campus = await prisma.campus.create({
      data: {
        name: body.name,
        campusCode: body.campusCode,
        campusSlug: body.campusCode.toLowerCase(),
        city: body.city,
        organizationId: orgId,
        regionId,
      },
    });
    return NextResponse.json(campus, { status: 201 });
  } catch (error) {
    console.error("Campus creation error:", error);
    return NextResponse.json(
      { error: "Failed to create campus" },
      { status: 500 }
    );
  }
}
