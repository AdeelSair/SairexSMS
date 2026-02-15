import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";

// 1. GET: Fetch campuses (tenant-scoped)
export async function GET() {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  try {
    const where =
      guard.role === "SUPER_ADMIN" ? {} : { organizationId: guard.organizationId };

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

    const orgId =
      guard.role === "SUPER_ADMIN" && body.organizationId
        ? parseInt(body.organizationId)
        : guard.organizationId;

    const campus = await prisma.campus.create({
      data: {
        name: body.name,
        campusCode: body.campusCode,
        campusSlug: body.campusCode.toLowerCase(),
        city: body.city,
        organizationId: orgId,
        regionId: body.regionId ? parseInt(body.regionId) : null,
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
