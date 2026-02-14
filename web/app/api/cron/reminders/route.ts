import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyParent } from "@/lib/notifications";

export async function GET() {
  try {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 3);

    // Date-only matching window: start/end of the day 3 days from now
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const pendingChallans = await prisma.feeChallan.findMany({
      where: {
        status: "UNPAID",
        dueDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
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
    return NextResponse.json({ error: "Failed to send reminders" }, { status: 500 });
  }
}
