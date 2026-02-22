import { prisma } from "@/lib/prisma";
import type { Prisma, ReminderChannel } from "@/lib/generated/prisma";

/* ── Types ──────────────────────────────────────────────── */

export interface ReminderRunResult {
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
  errors: string[];
}

export interface ReminderScope {
  organizationId: string;
  unitPath?: string | null;
  campusId?: number;
}

interface OverdueChallan {
  id: number;
  studentId: number;
  campusId: number;
  challanNo: string;
  dueDate: Date;
  totalAmount: number;
  paidAmount: number;
  outstanding: number;
  daysOverdue: number;
  student: { fullName: string; admissionNo: string; grade: string };
  campus: { name: string };
}

interface MatchedRule {
  id: string;
  channel: ReminderChannel;
  template: string;
  frequencyDays: number;
}

/* ── Template Renderer ──────────────────────────────────── */

export function renderTemplate(
  template: string,
  vars: Record<string, string | number>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), String(value));
  }
  return result;
}

/* ── Main Engine ────────────────────────────────────────── */

export async function runReminderEngine(
  scope: ReminderScope,
): Promise<ReminderRunResult> {
  const { organizationId } = scope;
  const now = new Date();
  const result: ReminderRunResult = { processed: 0, sent: 0, skipped: 0, failed: 0, errors: [] };

  const challanWhere: Prisma.FeeChallanWhereInput = {
    organizationId,
    status: { in: ["UNPAID", "PARTIALLY_PAID"] },
    dueDate: { lt: now },
  };
  if (scope.campusId) {
    challanWhere.campusId = scope.campusId;
  } else if (scope.unitPath) {
    challanWhere.campus = { fullUnitPath: { startsWith: scope.unitPath } };
  }

  const [rawChallans, rules] = await Promise.all([
    prisma.feeChallan.findMany({
      where: challanWhere,
      select: {
        id: true,
        studentId: true,
        campusId: true,
        challanNo: true,
        dueDate: true,
        totalAmount: true,
        paidAmount: true,
        student: { select: { fullName: true, admissionNo: true, grade: true } },
        campus: { select: { name: true } },
      },
      orderBy: { dueDate: "asc" },
    }),
    prisma.reminderRule.findMany({
      where: { organizationId, isActive: true },
      orderBy: { minDaysOverdue: "asc" },
    }),
  ]);

  if (rawChallans.length === 0 || rules.length === 0) return result;

  const challans: OverdueChallan[] = rawChallans.map((c) => {
    const outstanding = Number(c.totalAmount) - Number(c.paidAmount);
    const daysOverdue = Math.floor((now.getTime() - c.dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return { ...c, totalAmount: Number(c.totalAmount), paidAmount: Number(c.paidAmount), outstanding, daysOverdue };
  }).filter((c) => c.outstanding > 0);

  const recentLogs = await prisma.reminderLog.findMany({
    where: {
      organizationId,
      studentId: { in: [...new Set(challans.map((c) => c.studentId))] },
      status: "SENT",
    },
    select: { studentId: true, reminderRuleId: true, sentAt: true },
    orderBy: { sentAt: "desc" },
  });

  const logIndex = new Map<string, Date>();
  for (const log of recentLogs) {
    const key = `${log.studentId}:${log.reminderRuleId}`;
    const existing = logIndex.get(key);
    if (!existing || log.sentAt > existing) {
      logIndex.set(key, log.sentAt);
    }
  }

  const rulesByCampus = new Map<number | null, typeof rules>();
  for (const rule of rules) {
    const key = rule.campusId;
    const list = rulesByCampus.get(key) ?? [];
    list.push(rule);
    rulesByCampus.set(key, list);
  }
  const globalRules = rulesByCampus.get(null) ?? [];

  const processed = new Set<string>();

  for (const challan of challans) {
    result.processed++;

    const applicableRules = [
      ...(rulesByCampus.get(challan.campusId) ?? []),
      ...globalRules,
    ];

    const matched = applicableRules.find((r) =>
      challan.daysOverdue >= r.minDaysOverdue &&
      (r.maxDaysOverdue == null || challan.daysOverdue <= r.maxDaysOverdue),
    );

    if (!matched) {
      result.skipped++;
      continue;
    }

    const dedupeKey = `${challan.studentId}:${matched.id}`;
    if (processed.has(dedupeKey)) {
      result.skipped++;
      continue;
    }

    const lastSent = logIndex.get(dedupeKey);
    if (lastSent) {
      const daysSinceLast = Math.floor((now.getTime() - lastSent.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceLast < matched.frequencyDays) {
        result.skipped++;
        continue;
      }
    }

    const templateVars: Record<string, string | number> = {
      studentName: challan.student.fullName,
      admissionNo: challan.student.admissionNo,
      grade: challan.student.grade,
      campusName: challan.campus.name,
      challanNo: challan.challanNo,
      amount: challan.outstanding,
      totalAmount: challan.totalAmount,
      paidAmount: challan.paidAmount,
      daysOverdue: challan.daysOverdue,
      dueDate: challan.dueDate.toISOString().split("T")[0],
    };

    const messageBody = renderTemplate(matched.template, templateVars);

    try {
      await enqueueReminderJob(organizationId, {
        channel: matched.channel,
        studentId: challan.studentId,
        challanId: challan.id,
        messageBody,
      });

      await prisma.reminderLog.create({
        data: {
          organizationId,
          studentId: challan.studentId,
          challanId: challan.id,
          reminderRuleId: matched.id,
          channel: matched.channel,
          status: "SENT",
          messageBody,
        },
      });

      processed.add(dedupeKey);
      result.sent++;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";

      await prisma.reminderLog.create({
        data: {
          organizationId,
          studentId: challan.studentId,
          challanId: challan.id,
          reminderRuleId: matched.id,
          channel: matched.channel,
          status: "FAILED",
          messageBody,
          errorDetail: errMsg,
        },
      }).catch(() => {});

      result.failed++;
      result.errors.push(`Student ${challan.studentId}: ${errMsg}`);
    }
  }

  return result;
}

/* ── Job Queue Integration ──────────────────────────────── */

async function enqueueReminderJob(
  organizationId: string,
  payload: {
    channel: ReminderChannel;
    studentId: number;
    challanId: number;
    messageBody: string;
  },
) {
  const jobType = payload.channel === "EMAIL" ? "EMAIL"
    : payload.channel === "WHATSAPP" ? "WHATSAPP"
    : "SMS";

  await prisma.job.create({
    data: {
      type: jobType,
      queue: "reminders",
      organizationId,
      payload: {
        studentId: payload.studentId,
        challanId: payload.challanId,
        channel: payload.channel,
        messageBody: payload.messageBody,
      },
      priority: 5,
    },
  });
}

/* ── Reminder Rule Helpers ──────────────────────────────── */

export async function getReminderRules(organizationId: string) {
  return prisma.reminderRule.findMany({
    where: { organizationId },
    orderBy: [{ minDaysOverdue: "asc" }, { channel: "asc" }],
    include: { campus: { select: { id: true, name: true } } },
  });
}

export async function createReminderRule(data: {
  organizationId: string;
  campusId?: number;
  name: string;
  minDaysOverdue: number;
  maxDaysOverdue?: number;
  channel: ReminderChannel;
  template: string;
  frequencyDays?: number;
}) {
  return prisma.reminderRule.create({
    data: {
      organizationId: data.organizationId,
      campusId: data.campusId ?? null,
      name: data.name,
      minDaysOverdue: data.minDaysOverdue,
      maxDaysOverdue: data.maxDaysOverdue ?? null,
      channel: data.channel,
      template: data.template,
      frequencyDays: data.frequencyDays ?? 7,
    },
  });
}

export async function updateReminderRule(
  ruleId: string,
  data: Partial<{
    name: string;
    minDaysOverdue: number;
    maxDaysOverdue: number | null;
    channel: ReminderChannel;
    template: string;
    frequencyDays: number;
    isActive: boolean;
  }>,
) {
  return prisma.reminderRule.update({ where: { id: ruleId }, data });
}

export async function deleteReminderRule(ruleId: string) {
  return prisma.reminderRule.update({ where: { id: ruleId }, data: { isActive: false } });
}

/* ── Reminder Stats ─────────────────────────────────────── */

export async function getReminderStats(
  organizationId: string,
  daysBack: number = 30,
) {
  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  const logs = await prisma.reminderLog.groupBy({
    by: ["channel", "status"],
    where: { organizationId, sentAt: { gte: since } },
    _count: { id: true },
  });

  const stats: Record<string, { sent: number; failed: number }> = {};

  for (const row of logs) {
    const ch = row.channel;
    if (!stats[ch]) stats[ch] = { sent: 0, failed: 0 };
    if (row.status === "SENT" || row.status === "DELIVERED") {
      stats[ch].sent += row._count.id;
    } else {
      stats[ch].failed += row._count.id;
    }
  }

  return stats;
}
