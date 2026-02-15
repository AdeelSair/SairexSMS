import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";

// 1. GET: Fetch all students (tenant-scoped)
export async function GET() {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  try {
    const where =
      guard.role === "SUPER_ADMIN" ? {} : { organizationId: guard.organizationId };

    const students = await prisma.student.findMany({
      where,
      include: {
        campus: true,
        organization: true,
      },
      orderBy: { id: "desc" },
    });
    return NextResponse.json(students);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 }
    );
  }
}

// 2. POST: Admit a new student (tenant-scoped)
export async function POST(request: Request) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  try {
    const body = await request.json();

    const orgId =
      guard.role === "SUPER_ADMIN" && body.organizationId
        ? parseInt(body.organizationId)
        : guard.organizationId;

    const student = await prisma.student.create({
      data: {
        fullName: body.fullName,
        admissionNo: body.admissionNo,
        grade: body.grade,
        organizationId: orgId,
        campusId: parseInt(body.campusId),
        feeStatus: "Unpaid",
      },
    });

    return NextResponse.json(student, { status: 201 });
  } catch (error) {
    console.error("Failed to admit student:", error);
    return NextResponse.json(
      { error: "Failed to admit student" },
      { status: 500 }
    );
  }
}
