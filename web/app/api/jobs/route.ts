import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, isSuperAdmin } from "@/lib/auth-guard";
import { scopeFilter } from "@/lib/tenant";

/**
 * GET /api/jobs?status=...&type=...&page=1&limit=50
 * Returns paginated job list for the admin dashboard.
 */
export async function GET(request: Request) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  const denied = requireRole(guard, "SUPER_ADMIN", "ORG_ADMIN");
  if (denied) return denied;

  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || undefined;
    const type = url.searchParams.get("type") || undefined;
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (!isSuperAdmin(guard) && guard.organizationId) {
      where.organizationId = guard.organizationId;
    }

    if (status) where.status = status;
    if (type) where.type = type;

    const [jobs, total, stats] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          queue: true,
          status: true,
          priority: true,
          attempts: true,
          maxAttempts: true,
          error: true,
          result: true,
          createdAt: true,
          startedAt: true,
          completedAt: true,
          failedAt: true,
          user: { select: { email: true } },
        },
      }),
      prisma.job.count({ where }),
      prisma.job.groupBy({
        by: ["status"],
        where: isSuperAdmin(guard) ? {} : { organizationId: guard.organizationId ?? undefined },
        _count: true,
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    for (const s of stats) {
      statusCounts[s.status] = s._count;
    }

    return NextResponse.json({
      jobs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      stats: statusCounts,
    });
  } catch (error) {
    console.error("Job list error:", error);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}
