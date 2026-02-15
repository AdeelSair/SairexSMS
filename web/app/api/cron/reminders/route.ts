import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyParent } from "@/lib/notifications";
import { requireAuth, requireRole } from "@/lib/auth-guard";

// GET: Send fee reminders for challans due in 3 days (SUPER_ADMIN or ORG_ADMIN only)
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

    // Tenant-scoped: only send reminders for the user's org (SUPER_ADMIN sees all)
    const where: any = {
      status: "UNPAID",
      dueDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
    };

    if (guard.role !== "SUPER_ADMIN") {
      where.organizationId = guard.organizationId;
    }

    const pendingChallans = await prisma.feeChallan.findMany({
      where,
      include: { student: true },
    });

    const summary = {
      totalChallans: pendingChallans.length,
      fullyNotified: 0,
      email: { sent: 0, failed: 0 },
      sms: { sent: 0, failed: 0 },
      whatsapp: { sent: 0, failed: 0 },
    };

    for (const challan of pendingChallans) {
      const result = await notifyParent(challan.student, challan, "REMINDER");

      if (result.email.sent) summary.email.sent += 1;
      else summary.email.failed += 1;

      if (result.sms.sent) summary.sms.sent += 1;
      else summary.sms.failed += 1;

      if (result.whatsapp.sent) summary.whatsapp.sent += 1;
      else summary.whatsapp.failed += 1;

      if (result.email.sent && result.sms.sent && result.whatsapp.sent) {
        summary.fullyNotified += 1;
      }
    }

    return NextResponse.json({
      message: "Reminders sent",
      remindersCount: pendingChallans.length,
      summary,
    });
  } catch (error) {
    console.error("Cron reminder error:", error);
    return NextResponse.json(
      { error: "Failed to send reminders" },
      { status: 500 }
    );
  }
}
