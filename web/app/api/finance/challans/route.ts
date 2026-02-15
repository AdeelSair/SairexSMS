import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";

// 1. GET: Fetch recent challans (tenant-scoped)
export async function GET() {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  try {
    const where =
      guard.role === "SUPER_ADMIN" ? {} : { organizationId: guard.organizationId };

    const challans = await prisma.feeChallan.findMany({
      where,
      include: {
        student: true,
        campus: true,
      },
      orderBy: { issueDate: "desc" },
      take: 50,
    });
    return NextResponse.json(challans);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch challans" },
      { status: 500 }
    );
  }
}

// 2. POST: The Billing Engine — generate challans for a batch (tenant-scoped)
export async function POST(request: Request) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  try {
    const body = await request.json();
    const { campusId, targetGrade, billingMonth, dueDate } = body;

    // Use session orgId (tenant boundary enforced)
    const orgId =
      guard.role === "SUPER_ADMIN" && body.organizationId
        ? parseInt(body.organizationId)
        : guard.organizationId;

    // A. Find all active students in this Campus & Grade
    const students = await prisma.student.findMany({
      where: {
        organizationId: orgId,
        campusId: parseInt(campusId),
        grade: targetGrade,
      },
    });

    if (students.length === 0) {
      return NextResponse.json(
        { error: "No students found in this grade." },
        { status: 404 }
      );
    }

    // B. Find the Fee Rules for this Campus & Grade
    const rules = await prisma.feeStructure.findMany({
      where: {
        organizationId: orgId,
        campusId: parseInt(campusId),
        isActive: true,
        OR: [
          { applicableGrade: targetGrade },
          { applicableGrade: null },
          { applicableGrade: "" },
        ],
      },
    });

    if (rules.length === 0) {
      return NextResponse.json(
        { error: "No fee rules found for this grade." },
        { status: 404 }
      );
    }

    // C. Calculate Total Amount
    let totalBillAmount = 0;
    rules.forEach((rule) => {
      totalBillAmount += Number(rule.amount);
    });

    // D. Generate Challans for Each Student
    let generatedCount = 0;
    const currentYear = new Date().getFullYear();

    for (const student of students) {
      const challanNo = `CH-${campusId}-${student.id}-${billingMonth.substring(0, 3).toUpperCase()}${currentYear}`;

      // Prevent double billing
      const existing = await prisma.feeChallan.findUnique({
        where: { challanNo },
      });

      if (!existing) {
        await prisma.feeChallan.create({
          data: {
            organizationId: orgId,
            campusId: parseInt(campusId),
            studentId: student.id,
            challanNo,
            dueDate: new Date(dueDate),
            totalAmount: totalBillAmount,
            status: "UNPAID",
            generatedBy: guard.email, // Real user from session instead of hardcoded value
          },
        });
        generatedCount++;
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `Generated ${generatedCount} challans successfully.`,
        studentsFound: students.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Billing Engine Error:", error);
    return NextResponse.json(
      { error: "Failed to generate challans" },
      { status: 500 }
    );
  }
}

// 3. PUT: Process Payment (tenant-scoped)
export async function PUT(request: Request) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  try {
    const body = await request.json();
    const { challanId, paymentMethod } = body;

    // Fetch the challan and verify it belongs to the user's org
    const challan = await prisma.feeChallan.findUnique({
      where: { id: parseInt(challanId) },
    });

    if (!challan) {
      return NextResponse.json(
        { error: "Challan not found" },
        { status: 404 }
      );
    }

    // Tenant boundary check
    if (
      guard.role !== "SUPER_ADMIN" &&
      challan.organizationId !== guard.organizationId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (challan.status === "PAID") {
      return NextResponse.json(
        { error: "Already paid" },
        { status: 400 }
      );
    }

    const updatedChallan = await prisma.feeChallan.update({
      where: { id: parseInt(challanId) },
      data: {
        status: "PAID",
        paidAmount: challan.totalAmount,
        paymentMethod,
        paidAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Payment recorded successfully",
    });
  } catch (error) {
    console.error("Payment Error:", error);
    return NextResponse.json(
      { error: "Failed to process payment" },
      { status: 500 }
    );
  }
}
