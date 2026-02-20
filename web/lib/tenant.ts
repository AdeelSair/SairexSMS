import { NextResponse } from "next/server";
import { AuthUser, isSuperAdmin } from "./auth-guard";
import { prisma } from "./prisma";

// ────────────────────────────────────────────────────────────
// 1.  SCOPE FILTER — builds the Prisma `where` clause
//     Respects SUPER_ADMIN (all), ORG_ADMIN (org), CAMPUS_ADMIN (org+campus)
// ────────────────────────────────────────────────────────────

type ScopeOptions = {
  /** Set true for models that have a campusId column (students, challans, structures, etc.) */
  hasCampus?: boolean;
};

/**
 * Returns a Prisma-compatible `where` filter scoped to the user's tenant.
 *
 * - SUPER_ADMIN  → {} (no restriction)
 * - ORG_ADMIN    → { organizationId }
 * - CAMPUS_ADMIN → { organizationId, campusId }  (if model has campusId)
 * - Others       → { organizationId, campusId }  (if model has campusId)
 */
export function scopeFilter(
  guard: AuthUser,
  opts: ScopeOptions = {}
): Record<string, unknown> {
  if (isSuperAdmin(guard)) return {};

  const where: Record<string, unknown> = {
    organizationId: guard.organizationId,
  };

  if (
    opts.hasCampus &&
    guard.campusId &&
    !["ORG_ADMIN"].includes(guard.role ?? "")
  ) {
    where.campusId = guard.campusId;
  }

  return where;
}

// ────────────────────────────────────────────────────────────
// 2.  RESOLVE ORG ID — determines the effective organizationId for writes
// ────────────────────────────────────────────────────────────

/**
 * For POST/PUT, determine the effective organizationId.
 * SUPER_ADMIN may override via request body; everyone else uses their session value.
 */
export function resolveOrgId(
  guard: AuthUser,
  bodyOrgId?: string | null
): string {
  if (isSuperAdmin(guard) && bodyOrgId) {
    return bodyOrgId;
  }
  return guard.organizationId ?? "";
}

// ────────────────────────────────────────────────────────────
// 3.  CROSS-REFERENCE VALIDATION
//     Ensures a referenced entity belongs to the same organization
// ────────────────────────────────────────────────────────────

type CrossRefCheck = {
  /** Prisma model name (lowercase, matching prisma client accessor) */
  model: "campus" | "feeHead" | "student";
  /** The ID value supplied by the client */
  id: number;
  /** Human-readable label for error messages */
  label: string;
};

/**
 * Validates that every referenced entity belongs to the given organizationId.
 * Returns null if all pass, or a 403 NextResponse describing the violation.
 */
export async function validateCrossRefs(
  orgId: string,
  checks: CrossRefCheck[]
): Promise<NextResponse | null> {
  for (const check of checks) {
    if (!check.id) continue;

    let record: { organizationId: string } | null = null;

    switch (check.model) {
      case "campus":
        record = await prisma.campus.findUnique({
          where: { id: check.id },
          select: { organizationId: true },
        });
        break;
      case "feeHead":
        record = await prisma.feeHead.findUnique({
          where: { id: check.id },
          select: { organizationId: true },
        });
        break;
      case "student":
        record = await prisma.student.findUnique({
          where: { id: check.id },
          select: { organizationId: true },
        });
        break;
    }

    if (!record) {
      return NextResponse.json(
        { error: `${check.label} not found (id: ${check.id})` },
        { status: 404 }
      );
    }

    if (record.organizationId !== orgId) {
      return NextResponse.json(
        {
          error: `${check.label} does not belong to your organization`,
        },
        { status: 403 }
      );
    }
  }

  return null;
}

// ────────────────────────────────────────────────────────────
// 4.  OWNERSHIP CHECK — verifies an existing record belongs to the user's org
// ────────────────────────────────────────────────────────────

/**
 * Verifies that a record's organizationId matches the user's.
 * Returns null if OK, or a 403 NextResponse.
 */
export function assertOwnership(
  guard: AuthUser,
  recordOrgId: string
): NextResponse | null {
  if (isSuperAdmin(guard)) return null;

  if (recordOrgId !== guard.organizationId) {
    return NextResponse.json(
      { error: "Forbidden — this record belongs to another organization" },
      { status: 403 }
    );
  }

  return null;
}
