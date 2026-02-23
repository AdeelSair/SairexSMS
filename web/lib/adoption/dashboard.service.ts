/**
 * Action-Based Dashboard — Service Layer
 *
 * Provides role-aware action buttons, quick stats, and activity feed
 * by orchestrating existing domain queries. No new business logic.
 *
 * Architecture:
 *   1. Static action registry (fallback for all orgs)
 *   2. Per-org overrides via DashboardAction table (enterprise)
 *   3. Quick stats via existing aggregation queries
 *   4. Activity feed from DomainEventLog
 */
import { prisma } from "@/lib/prisma";
import type { AuthUser } from "@/lib/auth-guard";
import { isSuperAdmin } from "@/lib/auth-guard";
import { scopeFilter } from "@/lib/tenant";

/* ── Action Types ─────────────────────────────────────── */

export interface DashboardActionDef {
  key: string;
  label: string;
  icon: string;
  route: string;
  category: "primary" | "secondary";
}

export interface QuickStat {
  key: string;
  label: string;
  value: number | string;
  trend?: "up" | "down" | "neutral";
  format?: "number" | "currency" | "percent";
}

export interface ActivityItem {
  id: string;
  eventType: string;
  label: string;
  occurredAt: Date;
  initiatedByUserId: number | null;
}

/* ── Static Action Registry ───────────────────────────── */

const ACTION_REGISTRY: Record<string, DashboardActionDef[]> = {
  ORG_ADMIN: [
    { key: "ENROLLMENT_STATS", label: "Enrollment Stats", icon: "users", route: "/admin/enrollments", category: "primary" },
    { key: "REVENUE_SNAPSHOT", label: "Revenue Snapshot", icon: "trending-up", route: "/admin/finance/revenue", category: "primary" },
    { key: "ACADEMIC_OVERVIEW", label: "Academic Overview", icon: "graduation-cap", route: "/admin/academic", category: "primary" },
    { key: "DEFAULTER_SUMMARY", label: "Defaulter Summary", icon: "alert-triangle", route: "/admin/finance/defaulters", category: "primary" },
    { key: "MANAGE_STAFF", label: "Manage Staff", icon: "user-cog", route: "/admin/staff", category: "primary" },
    { key: "BROADCAST_MESSAGE", label: "Send Broadcast", icon: "megaphone", route: "/admin/messages/broadcast", category: "primary" },
  ],
  CAMPUS_ADMIN: [
    { key: "ENROLLMENT_STATS", label: "Enrollment Stats", icon: "users", route: "/admin/enrollments", category: "primary" },
    { key: "REVENUE_SNAPSHOT", label: "Revenue Today", icon: "trending-up", route: "/admin/finance/revenue", category: "primary" },
    { key: "ATTENDANCE_OVERVIEW", label: "Attendance Today", icon: "calendar-check", route: "/admin/attendance", category: "primary" },
    { key: "DEFAULTER_SUMMARY", label: "Defaulter List", icon: "alert-triangle", route: "/admin/finance/defaulters", category: "primary" },
    { key: "ADD_STUDENT", label: "Add Student", icon: "user-plus", route: "/admin/students/new", category: "primary" },
    { key: "SEND_MESSAGE", label: "Send Message", icon: "megaphone", route: "/admin/messages", category: "secondary" },
  ],
  ACCOUNTANT: [
    { key: "COLLECT_FEE", label: "Collect Fee", icon: "wallet", route: "/admin/fees/collect", category: "primary" },
    { key: "TODAYS_COLLECTION", label: "Today's Collection", icon: "banknote", route: "/admin/finance/today", category: "primary" },
    { key: "REVENUE_SUMMARY", label: "Revenue Summary", icon: "bar-chart-3", route: "/admin/finance/revenue", category: "primary" },
    { key: "PRINT_CHALLAN", label: "Print Challan", icon: "printer", route: "/admin/fees/print", category: "primary" },
    { key: "RECONCILE_PAYMENT", label: "Reconcile Payment", icon: "check-circle", route: "/admin/finance/reconcile", category: "primary" },
    { key: "DEFAULTER_REMINDER", label: "Send Reminders", icon: "bell", route: "/admin/finance/reminders", category: "secondary" },
  ],
  TEACHER: [
    { key: "MARK_ATTENDANCE", label: "Mark Attendance", icon: "calendar", route: "/admin/attendance/mark", category: "primary" },
    { key: "ENTER_MARKS", label: "Enter Marks", icon: "edit-3", route: "/admin/exams/results", category: "primary" },
    { key: "VIEW_CLASS", label: "View Class List", icon: "list", route: "/admin/classes/my", category: "primary" },
    { key: "ATTENDANCE_SUMMARY", label: "Attendance Summary", icon: "pie-chart", route: "/admin/attendance/summary", category: "primary" },
    { key: "CLASS_MESSAGE", label: "Send Class Message", icon: "message-square", route: "/admin/messages/class", category: "secondary" },
  ],
  STAFF: [
    { key: "ADD_STUDENT", label: "Add Student", icon: "user-plus", route: "/admin/students/new", category: "primary" },
    { key: "COLLECT_FEE", label: "Collect Fee", icon: "wallet", route: "/admin/fees/collect", category: "primary" },
    { key: "PRINT_CHALLAN", label: "Print Challan", icon: "printer", route: "/admin/fees/print", category: "primary" },
    { key: "SEARCH_STUDENT", label: "Search Student", icon: "search", route: "/admin/students", category: "primary" },
    { key: "NEW_ADMISSION", label: "New Admission", icon: "clipboard-plus", route: "/admin/admissions/new", category: "primary" },
    { key: "SEND_MESSAGE", label: "Send Message", icon: "megaphone", route: "/admin/messages", category: "secondary" },
  ],
  PARENT: [
    { key: "VIEW_CHILD", label: "My Child", icon: "user", route: "/parent/child", category: "primary" },
    { key: "FEE_STATUS", label: "Fee Status", icon: "wallet", route: "/parent/fees", category: "primary" },
    { key: "ATTENDANCE", label: "Attendance", icon: "calendar", route: "/parent/attendance", category: "primary" },
    { key: "RESULTS", label: "Results", icon: "award", route: "/parent/results", category: "primary" },
  ],
};

const HIERARCHICAL_ADMIN_ROLES = [
  "REGION_ADMIN",
  "SUBREGION_ADMIN",
  "ZONE_ADMIN",
];

/* ── Get Actions ──────────────────────────────────────── */

export async function getDashboardActions(
  guard: AuthUser,
): Promise<DashboardActionDef[]> {
  const role = guard.role ?? "";
  const orgId = guard.organizationId;

  if (orgId) {
    const customActions = await prisma.dashboardAction.findMany({
      where: {
        organizationId: orgId,
        role,
        enabled: true,
      },
      orderBy: { displayOrder: "asc" },
    });

    if (customActions.length > 0) {
      return customActions.map((a) => ({
        key: a.actionKey,
        label: a.label,
        icon: a.icon,
        route: a.route,
        category: a.category as "primary" | "secondary",
      }));
    }
  }

  const effectiveRole = HIERARCHICAL_ADMIN_ROLES.includes(role)
    ? "ORG_ADMIN"
    : role;

  if (isSuperAdmin(guard)) {
    return ACTION_REGISTRY["ORG_ADMIN"] ?? [];
  }

  return ACTION_REGISTRY[effectiveRole] ?? ACTION_REGISTRY["STAFF"] ?? [];
}

/* ── Quick Stats ──────────────────────────────────────── */

export async function getDashboardStats(
  guard: AuthUser,
): Promise<QuickStat[]> {
  const role = guard.role ?? "";
  const orgId = guard.organizationId;

  if (!orgId && !isSuperAdmin(guard)) return [];

  const baseWhere = scopeFilter(guard, { hasCampus: true });
  const orgWhere = scopeFilter(guard);

  if (
    role === "ORG_ADMIN" ||
    HIERARCHICAL_ADMIN_ROLES.includes(role) ||
    isSuperAdmin(guard)
  ) {
    return getAdminStats(orgWhere, baseWhere);
  }

  if (role === "CAMPUS_ADMIN") {
    return getCampusAdminStats(orgWhere, baseWhere);
  }

  if (role === "ACCOUNTANT") {
    return getAccountantStats(orgWhere, baseWhere);
  }

  if (role === "TEACHER") {
    return getTeacherStats(guard);
  }

  return getStaffStats(orgWhere, baseWhere);
}

async function getAdminStats(
  orgWhere: Record<string, unknown>,
  campusWhere: Record<string, unknown>,
): Promise<QuickStat[]> {
  const [studentCount, campusCount, todayCollection, pendingChallans] =
    await Promise.all([
      prisma.student.count({ where: orgWhere }),
      prisma.campus.count({ where: orgWhere }),
      getTodayCollection(campusWhere),
      prisma.feeChallan.count({
        where: {
          ...campusWhere,
          status: { in: ["UNPAID", "PARTIALLY_PAID"] },
        },
      }),
    ]);

  return [
    { key: "students", label: "Total Students", value: studentCount, format: "number" },
    { key: "campuses", label: "Campuses", value: campusCount, format: "number" },
    { key: "today_collection", label: "Today's Collection", value: todayCollection, format: "currency" },
    { key: "pending_challans", label: "Pending Challans", value: pendingChallans, format: "number" },
  ];
}

async function getCampusAdminStats(
  orgWhere: Record<string, unknown>,
  campusWhere: Record<string, unknown>,
): Promise<QuickStat[]> {
  const [studentCount, todayCollection, pendingChallans] =
    await Promise.all([
      prisma.student.count({ where: campusWhere }),
      getTodayCollection(campusWhere),
      prisma.feeChallan.count({
        where: {
          ...campusWhere,
          status: { in: ["UNPAID", "PARTIALLY_PAID"] },
        },
      }),
    ]);

  return [
    { key: "students", label: "Total Students", value: studentCount, format: "number" },
    { key: "today_collection", label: "Today's Collection", value: todayCollection, format: "currency" },
    { key: "pending_challans", label: "Pending Challans", value: pendingChallans, format: "number" },
  ];
}

async function getAccountantStats(
  orgWhere: Record<string, unknown>,
  campusWhere: Record<string, unknown>,
): Promise<QuickStat[]> {
  const [todayCollection, pendingChallans, overdueCount] =
    await Promise.all([
      getTodayCollection(campusWhere),
      prisma.feeChallan.count({
        where: {
          ...campusWhere,
          status: { in: ["UNPAID", "PARTIALLY_PAID"] },
        },
      }),
      prisma.feeChallan.count({
        where: {
          ...campusWhere,
          status: { in: ["UNPAID", "PARTIALLY_PAID"] },
          dueDate: { lt: new Date() },
        },
      }),
    ]);

  return [
    { key: "today_collection", label: "Today's Collection", value: todayCollection, format: "currency" },
    { key: "pending_challans", label: "Pending", value: pendingChallans, format: "number" },
    { key: "overdue", label: "Overdue", value: overdueCount, format: "number" },
  ];
}

async function getTeacherStats(guard: AuthUser): Promise<QuickStat[]> {
  if (!guard.campusId || !guard.organizationId) return [];

  const activeYear = await prisma.academicYear.findFirst({
    where: { organizationId: guard.organizationId, isActive: true },
    select: { id: true },
  });

  if (!activeYear) return [];

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const enrollmentCount = await prisma.studentEnrollment.count({
    where: {
      organizationId: guard.organizationId,
      academicYearId: activeYear.id,
      campusId: guard.campusId,
      status: "ACTIVE",
    },
  });

  const todayAttendance = await prisma.attendance.count({
    where: {
      organizationId: guard.organizationId,
      academicYearId: activeYear.id,
      campusId: guard.campusId,
      date: today,
    },
  });

  const presentCount = await prisma.attendance.count({
    where: {
      organizationId: guard.organizationId,
      academicYearId: activeYear.id,
      campusId: guard.campusId,
      date: today,
      status: { in: ["PRESENT", "LATE"] },
    },
  });

  const attendancePercent = todayAttendance > 0
    ? Math.round((presentCount / todayAttendance) * 100)
    : 0;

  return [
    { key: "students", label: "My Students", value: enrollmentCount, format: "number" },
    { key: "today_attendance", label: "Attendance Today", value: `${attendancePercent}%`, format: "percent" },
    { key: "marked_today", label: "Marked Today", value: todayAttendance, format: "number" },
  ];
}

async function getStaffStats(
  orgWhere: Record<string, unknown>,
  campusWhere: Record<string, unknown>,
): Promise<QuickStat[]> {
  const [studentCount, todayCollection] = await Promise.all([
    prisma.student.count({ where: campusWhere }),
    getTodayCollection(campusWhere),
  ]);

  return [
    { key: "students", label: "Students", value: studentCount, format: "number" },
    { key: "today_collection", label: "Today's Collection", value: todayCollection, format: "currency" },
  ];
}

async function getTodayCollection(
  where: Record<string, unknown>,
): Promise<number> {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const result = await prisma.paymentRecord.aggregate({
    where: {
      ...where,
      status: "RECONCILED",
      paidAt: { gte: todayStart },
    },
    _sum: { amount: true },
  });

  return Number(result._sum.amount ?? 0);
}

/* ── Activity Feed ────────────────────────────────────── */

const EVENT_LABELS: Record<string, string> = {
  PaymentReconciled: "Payment received",
  ChallanCreated: "Challan generated",
  StudentEnrolled: "Student enrolled",
  StudentWithdrawn: "Student withdrawn",
  StudentPromoted: "Student promoted",
  FeePostingCompleted: "Fee posting completed",
  ExamPublished: "Exam results published",
  AcademicYearActivated: "Academic year activated",
  AcademicYearClosed: "Academic year closed",
  PromotionRunCompleted: "Promotion run completed",
  OrganizationBootstrapped: "School setup completed",
  ParentAccessCreated: "Parent linked",
};

export async function getDashboardActivity(
  guard: AuthUser,
  limit = 15,
): Promise<ActivityItem[]> {
  const orgId = guard.organizationId;

  if (!orgId && !isSuperAdmin(guard)) return [];

  const where: Record<string, unknown> = {};
  if (orgId) where.organizationId = orgId;

  const events = await prisma.domainEventLog.findMany({
    where,
    orderBy: { occurredAt: "desc" },
    take: limit,
    select: {
      id: true,
      eventType: true,
      occurredAt: true,
      initiatedByUserId: true,
    },
  });

  return events.map((e) => ({
    id: e.id,
    eventType: e.eventType,
    label: EVENT_LABELS[e.eventType] ?? e.eventType,
    occurredAt: e.occurredAt,
    initiatedByUserId: e.initiatedByUserId,
  }));
}
