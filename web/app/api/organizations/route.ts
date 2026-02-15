import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/auth-guard";

// 1. GET: Fetch organizations (SUPER_ADMIN sees all, others see only their own)
export async function GET() {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  try {
    const where =
      guard.role === "SUPER_ADMIN" ? {} : { id: guard.organizationId };

    const orgs = await prisma.organization.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(orgs);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch orgs" },
      { status: 500 }
    );
  }
}

// 2. POST: Create a new Organization (SUPER_ADMIN only)
export async function POST(request: Request) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  const denied = requireRole(guard, "SUPER_ADMIN");
  if (denied) return denied;

  try {
    const body = await request.json();
    const { name, orgCode, plan } = body;

    if (!name || !orgCode) {
      return NextResponse.json(
        { error: "Name and Code are required" },
        { status: 400 }
      );
    }

    const newOrg = await prisma.organization.create({
      data: {
        name,
        orgCode,
        subscriptionPlan: plan || "FREE",
        subscriptionStatus: "ACTIVE",
      },
    });

    return NextResponse.json(newOrg, { status: 201 });
  } catch (error) {
    console.error("Failed to create org:", error);
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    );
  }
}
