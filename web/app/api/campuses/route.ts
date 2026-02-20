import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { scopeFilter, resolveOrgId } from "@/lib/tenant";
import { generateUnitCode, buildFullUnitPath } from "@/lib/unit-code";

export async function GET() {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  try {
    const where = scopeFilter(guard);

    const campuses = await prisma.campus.findMany({
      where,
      include: {
        organization: { select: { id: true, organizationName: true } },
        city: {
          select: {
            id: true,
            name: true,
            unitCode: true,
            region: { select: { id: true, name: true, unitCode: true } },
          },
        },
        zone: { select: { id: true, name: true, unitCode: true } },
      },
    });
    return NextResponse.json(campuses);
  } catch (error) {
    console.error("Campus fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch campuses" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  try {
    const body = await request.json();
    const orgId = resolveOrgId(guard, body.organizationId);

    if (!body.cityId) {
      return NextResponse.json(
        { error: "City is required" },
        { status: 400 },
      );
    }

    const city = await prisma.city.findUnique({ where: { id: body.cityId } });
    if (!city) {
      return NextResponse.json(
        { error: "City not found" },
        { status: 404 },
      );
    }

    if (body.zoneId) {
      const zone = await prisma.zone.findUnique({ where: { id: body.zoneId } });
      if (!zone || zone.cityId !== body.cityId) {
        return NextResponse.json(
          { error: "Zone not found or does not belong to selected city" },
          { status: 400 },
        );
      }
    }

    const campus = await prisma.$transaction(async (tx) => {
      const scopeId = body.zoneId || body.cityId;
      const unitCode = await generateUnitCode("CAMPUS", scopeId, tx);
      const fullUnitPath = await buildFullUnitPath(
        body.cityId,
        body.zoneId || null,
        unitCode,
        tx,
      );

      return tx.campus.create({
        data: {
          name: body.name,
          campusCode: body.campusCode,
          campusSlug: body.campusCode.toLowerCase(),
          unitCode,
          fullUnitPath,
          organizationId: orgId,
          cityId: body.cityId,
          zoneId: body.zoneId || null,
        },
      });
    });

    return NextResponse.json(campus, { status: 201 });
  } catch (error) {
    console.error("Campus creation error:", error);
    return NextResponse.json(
      { error: "Failed to create campus" },
      { status: 500 },
    );
  }
}
