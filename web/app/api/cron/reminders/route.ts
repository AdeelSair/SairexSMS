import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyParent } from "@/lib/notifications";
import { requireAuth, requireRole } from "@/lib/auth-guard";
import { scopeFilter } from "@/lib/tenant";

/**
 * GET /api/cron/reminders
 *
 * Finds all UNPAID challans due in 3 days and enqueues a NOTIFICATION
 * job for each. Returns immediately — actual delivery is async.
 */
export async function GET() {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  const denied = requireRole(guard, "SUPER_ADMIN", "ORG_ADMIN");
  if (denied) return denied;

  try {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 3);

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const where = {
      ...scopeFilter(guard, { hasCampus: true }),
      status: "UNPAID",
      dueDate: { gte: startOfDay, lte: endOfDay },
    };

    const pendingChallans = await prisma.feeChallan.findMany({
      where,
      include: { student: true },
    });

    const jobIds: string[] = [];

    for (const challan of pendingChallans) {
      const jobId = await notifyParent(challan.student, challan, "REMINDER");
      jobIds.push(jobId);
    }

    return NextResponse.json({
      message: `Enqueued ${jobIds.length} reminder notification(s)`,
      count: jobIds.length,
      jobIds,
    });
  } catch (error) {
    console.error("Cron reminder error:", error);
    return NextResponse.json(
      { error: "Failed to enqueue reminders" },
      { status: 500 }
    );
  }
}
