import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";

// 1. GET: Fetch pricing rules (tenant-scoped)
export async function GET() {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  try {
    const where =
      guard.role === "SUPER_ADMIN" ? {} : { organizationId: guard.organizationId };

    const structures = await prisma.feeStructure.findMany({
      where,
      include: {
        organization: true,
        campus: true,
        feeHead: true,
      },
      orderBy: { id: "desc" },
    });
    return NextResponse.json(structures);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch rules" },
      { status: 500 }
    );
  }
}

// 2. POST: Create a pricing rule (tenant-scoped)
export async function POST(request: Request) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  try {
    const body = await request.json();

    const orgId =
      guard.role === "SUPER_ADMIN" && body.organizationId
        ? parseInt(body.organizationId)
        : guard.organizationId;

    const structure = await prisma.feeStructure.create({
      data: {
        name: body.name,
        amount: parseFloat(body.amount),
        frequency: body.frequency,
        applicableGrade: body.applicableGrade || null,
        organizationId: orgId,
        campusId: parseInt(body.campusId),
        feeHeadId: parseInt(body.feeHeadId),
      },
    });

    return NextResponse.json(structure, { status: 201 });
  } catch (error) {
    console.error("Pricing Rule Error:", error);
    return NextResponse.json(
      { error: "Failed to create pricing rule" },
      { status: 500 }
    );
  }
}
