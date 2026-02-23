import { NextResponse } from "next/server";
import { requireAuth, requireRole, isSuperAdmin } from "@/lib/auth-guard";
import type { AttendanceStatus } from "@/lib/generated/prisma";
import { updateAttendance, AttendanceError } from "@/lib/academic/attendance.service";
import { AcademicYearError } from "@/lib/academic/academic-year.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/academic/attendance/:id
 *
 * Body: { status, remarks? }
 */
export async function PATCH(request: Request, context: RouteContext) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  const roleCheck = requireRole(
    guard, "SUPER_ADMIN", "ORG_ADMIN", "CAMPUS_ADMIN", "TEACHER",
  );
  if (roleCheck) return roleCheck;

  try {
    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;

    const orgId = isSuperAdmin(guard)
      ? ((body.orgId as string) ?? guard.organizationId)
      : guard.organizationId;

    if (!orgId) {
      return NextResponse.json(
        { ok: false, error: "Organization context required" },
        { status: 400 },
      );
    }

    const status = body.status as AttendanceStatus;
    if (!status) {
      return NextResponse.json(
        { ok: false, error: "status is required" },
        { status: 400 },
      );
    }

    const data = await updateAttendance({
      attendanceId: id,
      organizationId: orgId,
      status,
      remarks: body.remarks as string | undefined,
    });

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    if (error instanceof AttendanceError || error instanceof AcademicYearError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Update failed";
    console.error("Attendance update error:", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
