import { auth } from "@/auth";
import { NextResponse } from "next/server";

/**
 * Authenticated user shape extracted from the JWT session.
 * Resolved from the user's active Membership + platform role.
 */
export type AuthUser = {
  id: number;
  email: string;
  platformRole: string | null;
  role: string | null;
  organizationId: string | null;
  campusId: number | null;
  membershipId: number | null;
};

/**
 * Returns true if the user holds the SUPER_ADMIN platform role.
 */
export function isSuperAdmin(user: AuthUser): boolean {
  return user.platformRole === "SUPER_ADMIN";
}

/**
 * Verifies the session and returns the authenticated user,
 * or a 401/403 NextResponse if something is wrong.
 *
 * Requires an organizationId (or platformRole) — use for admin API routes.
 */
export async function requireAuth(): Promise<AuthUser | NextResponse> {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as Record<string, unknown>;

  const platformRole = (user.platformRole as string) ?? null;
  const organizationId = user.organizationId ? String(user.organizationId) : null;

  if (!organizationId && !platformRole) {
    return NextResponse.json(
      { error: "No organization assigned to this account. Please complete onboarding first." },
      { status: 403 },
    );
  }

  return {
    id: parseInt(user.id as string, 10),
    email: user.email as string,
    platformRole,
    role: (user.role as string) ?? null,
    organizationId,
    campusId: user.campusId ? Number(user.campusId) : null,
    membershipId: user.membershipId ? Number(user.membershipId) : null,
  };
}

/**
 * Lighter auth check for onboarding routes.
 * Only requires a verified, logged-in user — no organization needed.
 */
export async function requireVerifiedAuth(): Promise<AuthUser | NextResponse> {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as Record<string, unknown>;

  return {
    id: parseInt(user.id as string, 10),
    email: user.email as string,
    platformRole: (user.platformRole as string) ?? null,
    role: (user.role as string) ?? null,
    organizationId: user.organizationId ? String(user.organizationId) : null,
    campusId: user.campusId ? Number(user.campusId) : null,
    membershipId: user.membershipId ? Number(user.membershipId) : null,
  };
}

/**
 * Checks if the user has one of the allowed roles.
 * Checks both platformRole and membership role.
 * Returns a 403 NextResponse if not, or null if allowed.
 */
export function requireRole(
  user: AuthUser,
  ...allowedRoles: string[]
): NextResponse | null {
  if (user.platformRole && allowedRoles.includes(user.platformRole)) {
    return null;
  }

  if (user.role && allowedRoles.includes(user.role)) {
    return null;
  }

  return NextResponse.json(
    { error: `Forbidden — requires one of: ${allowedRoles.join(", ")}` },
    { status: 403 },
  );
}
