import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { generateUnitCode, generateCityCode } from "@/lib/unit-code";

/**
 * GET /api/regions
 * Returns the full geo hierarchy: regions, subRegions, cities, zones.
 */
export async function GET() {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  try {
    const [regions, subRegions, cities, zones] = await Promise.all([
      prisma.region.findMany({ orderBy: { name: "asc" } }),
      prisma.subRegion.findMany({ orderBy: { name: "asc" } }),
      prisma.city.findMany({ orderBy: { name: "asc" } }),
      prisma.zone.findMany({ orderBy: { name: "asc" } }),
    ]);

    return NextResponse.json({ regions, subRegions, cities, zones });
  } catch (error) {
    console.error("Geo hierarchy fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch geo hierarchy" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/regions
 * Create a geo entity with auto-generated unitCode.
 * Body: { type: "region"|"subRegion"|"city"|"zone", name, ...optional parent IDs }
 */
export async function POST(request: Request) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  try {
    const body = await request.json();
    const { type, name } = body;

    if (!type || !name) {
      return NextResponse.json(
        { error: "type and name are required" },
        { status: 400 },
      );
    }

    switch (type) {
      case "region": {
        const region = await prisma.$transaction(async (tx) => {
          const unitCode = await generateUnitCode("REGION", null, tx);
          return tx.region.create({ data: { name, unitCode } });
        });
        return NextResponse.json(region, { status: 201 });
      }

      case "subRegion": {
        const parentId = body.regionId || null;
        const subRegion = await prisma.$transaction(async (tx) => {
          const unitCode = await generateUnitCode("SUBREGION", parentId, tx);
          return tx.subRegion.create({
            data: { name, unitCode, regionId: parentId },
          });
        });
        return NextResponse.json(subRegion, { status: 201 });
      }

      case "city": {
        const city = await prisma.$transaction(async (tx) => {
          const unitCode = await generateCityCode(name, tx);
          return tx.city.create({
            data: {
              name,
              unitCode,
              regionId: body.regionId || null,
              subRegionId: body.subRegionId || null,
            },
          });
        });
        return NextResponse.json(city, { status: 201 });
      }

      case "zone": {
        if (!body.cityId) {
          return NextResponse.json(
            { error: "cityId is required for zones" },
            { status: 400 },
          );
        }
        const zone = await prisma.$transaction(async (tx) => {
          const unitCode = await generateUnitCode("ZONE", body.cityId, tx);
          return tx.zone.create({
            data: { name, unitCode, cityId: body.cityId },
          });
        });
        return NextResponse.json(zone, { status: 201 });
      }

      default:
        return NextResponse.json(
          { error: "Invalid type. Must be: region, subRegion, city, or zone" },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Geo entity creation error:", error);
    return NextResponse.json(
      { error: "Failed to create geo entity" },
      { status: 500 },
    );
  }
}
