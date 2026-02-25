import { NextResponse } from "next/server";
import { isSuperAdmin, requireAuth } from "@/lib/auth-guard";
import { getOrganizationPlanUsage } from "@/lib/billing/plan-usage.service";

export async function GET(request: Request) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  try {
    const { searchParams } = new URL(request.url);
    const orgId = isSuperAdmin(guard)
      ? (searchParams.get("orgId") ?? guard.organizationId)
      : guard.organizationId;

    if (!orgId) {
      return NextResponse.json(
        { ok: false, error: "Organization context required" },
        { status: 400 },
      );
    }

    const data = await getOrganizationPlanUsage(orgId);
    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load plan usage";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

