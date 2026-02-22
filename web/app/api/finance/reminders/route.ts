import { NextResponse } from "next/server";
import { requireAuth, requireRole, isSuperAdmin } from "@/lib/auth-guard";
import {
  runReminderEngine,
  getReminderStats,
  type ReminderScope,
} from "@/lib/finance/reminder-engine.service";

/**
 * POST /api/finance/reminders
 *
 * Trigger the reminder engine for the authenticated user's scope.
 * Restricted to ORG_ADMIN+ roles.
 */
export async function POST(request: Request) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  const roleCheck = requireRole(guard, "SUPER_ADMIN", "ORG_ADMIN", "REGION_ADMIN");
  if (roleCheck) return roleCheck;

  try {
    const body = await request.json().catch(() => ({}));

    const orgId = isSuperAdmin(guard)
      ? ((body as Record<string, unknown>).orgId as string ?? guard.organizationId)
      : guard.organizationId;

    if (!orgId) {
      return NextResponse.json({ ok: false, error: "Organization context required" }, { status: 400 });
    }

    const scope: ReminderScope = { organizationId: orgId };

    if (!isSuperAdmin(guard) && guard.role !== "ORG_ADMIN" && guard.unitPath) {
      scope.unitPath = guard.unitPath;
    }

    const campusId = (body as Record<string, unknown>).campusId;
    if (typeof campusId === "number") {
      scope.campusId = campusId;
    } else if (guard.campusId && guard.role === "CAMPUS_ADMIN") {
      scope.campusId = guard.campusId;
    }

    const result = await runReminderEngine(scope);

    return NextResponse.json({ ok: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Reminder engine failed";
    console.error("Reminder engine error:", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * GET /api/finance/reminders?daysBack=30
 *
 * Returns reminder delivery stats by channel.
 */
export async function GET(request: Request) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  try {
    const { searchParams } = new URL(request.url);

    const orgId = isSuperAdmin(guard)
      ? (searchParams.get("orgId") ?? guard.organizationId)
      : guard.organizationId;

    if (!orgId) {
      return NextResponse.json({ ok: false, error: "Organization context required" }, { status: 400 });
    }

    const daysBack = parseInt(searchParams.get("daysBack") ?? "30", 10) || 30;
    const stats = await getReminderStats(orgId, daysBack);

    return NextResponse.json({ ok: true, data: stats });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch reminder stats";
    console.error("Reminder stats error:", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
