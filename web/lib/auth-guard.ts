import { auth } from "@/auth";
import { NextResponse } from "next/server";

/**
 * Authenticated user shape extracted from the JWT session.
 */
export type AuthUser = {
  email: string;
  role: string;
  organizationId: string;
  campusId: number | null;
};

/**
 * Verifies the session and returns the authenticated user,
 * or a 401/403 NextResponse if something is wrong.
 *
 * Usage in any API route:
 *   const guard = await requireAuth();
 *   if (guard instanceof NextResponse) return guard;
 *   // guard is now AuthUser — safe to use guard.organizationId, guard.role, etc.
 */
export async function requireAuth(): Promise<AuthUser | NextResponse> {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;

  if (!user.organizationId) {
    return NextResponse.json(
      { error: "No organization assigned to this account" },
      { status: 403 }
    );
  }

  return {
    email: user.email,
    role: user.role as string,
    organizationId: String(user.organizationId),
    campusId: user.campusId ? Number(user.campusId) : null,
  };
}

/**
 * Checks if the user has one of the allowed roles.
 * Returns a 403 NextResponse if not, or null if allowed.
 *
 * Usage:
 *   const denied = requireRole(user, "SUPER_ADMIN", "ORG_ADMIN");
 *   if (denied) return denied;
 */
export function requireRole(
  user: AuthUser,
  ...allowedRoles: string[]
): NextResponse | null {
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json(
      { error: `Forbidden — requires one of: ${allowedRoles.join(", ")}` },
      { status: 403 }
    );
  }
  return null;
}
