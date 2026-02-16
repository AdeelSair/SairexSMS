import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/auth-guard";
import { assertOwnership } from "@/lib/tenant";
import {
  createOrganizationAddressSchema,
  updateOrganizationAddressSchema,
} from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET: List addresses for an organization ─────────────────────────────────

export async function GET(request: Request, ctx: RouteContext) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  const { id: orgId } = await ctx.params;

  const ownershipError = assertOwnership(guard, orgId);
  if (ownershipError) return ownershipError;

  try {
    const addresses = await prisma.organizationAddress.findMany({
      where: { organizationId: orgId },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(addresses);
  } catch (error) {
    console.error("Failed to fetch addresses:", error);
    return NextResponse.json(
      { error: "Failed to fetch addresses" },
      { status: 500 }
    );
  }
}

// ─── POST: Create a new address ──────────────────────────────────────────────

export async function POST(request: Request, ctx: RouteContext) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  const denied = requireRole(guard, "SUPER_ADMIN", "ORG_ADMIN");
  if (denied) return denied;

  const { id: orgId } = await ctx.params;

  const ownershipError = assertOwnership(guard, orgId);
  if (ownershipError) return ownershipError;

  try {
    const body = await request.json();

    const parsed = createOrganizationAddressSchema.safeParse({
      ...body,
      organizationId: orgId,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Business rule: only one primary address per addressType per org
    if (parsed.data.isPrimary) {
      await prisma.organizationAddress.updateMany({
        where: {
          organizationId: orgId,
          addressType: parsed.data.addressType,
          isPrimary: true,
        },
        data: { isPrimary: false },
      });
    }

    const address = await prisma.organizationAddress.create({
      data: parsed.data,
    });

    return NextResponse.json(address, { status: 201 });
  } catch (error) {
    console.error("Failed to create address:", error);
    return NextResponse.json(
      { error: "Failed to create address" },
      { status: 500 }
    );
  }
}

// ─── PUT: Update an existing address ─────────────────────────────────────────

export async function PUT(request: Request, ctx: RouteContext) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  const denied = requireRole(guard, "SUPER_ADMIN", "ORG_ADMIN");
  if (denied) return denied;

  const { id: orgId } = await ctx.params;

  const ownershipError = assertOwnership(guard, orgId);
  if (ownershipError) return ownershipError;

  try {
    const body = await request.json();
    const { addressId, ...updateData } = body;

    if (!addressId) {
      return NextResponse.json(
        { error: "addressId is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.organizationAddress.findUnique({
      where: { id: parseInt(addressId) },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Address not found" },
        { status: 404 }
      );
    }

    if (existing.organizationId !== orgId) {
      return NextResponse.json(
        { error: "Address does not belong to this organization" },
        { status: 403 }
      );
    }

    const parsed = updateOrganizationAddressSchema.safeParse(updateData);
    if (!parsed.success) {
      return NextResponse.json(
        { errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Business rule: if setting isPrimary = true, unset others of same type
    const effectiveType = parsed.data.addressType || existing.addressType;
    if (parsed.data.isPrimary) {
      await prisma.organizationAddress.updateMany({
        where: {
          organizationId: orgId,
          addressType: effectiveType,
          isPrimary: true,
          id: { not: existing.id },
        },
        data: { isPrimary: false },
      });
    }

    const updated = await prisma.organizationAddress.update({
      where: { id: existing.id },
      data: parsed.data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update address:", error);
    return NextResponse.json(
      { error: "Failed to update address" },
      { status: 500 }
    );
  }
}

// ─── DELETE: Remove an address ───────────────────────────────────────────────

export async function DELETE(request: Request, ctx: RouteContext) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  const denied = requireRole(guard, "SUPER_ADMIN", "ORG_ADMIN");
  if (denied) return denied;

  const { id: orgId } = await ctx.params;

  const ownershipError = assertOwnership(guard, orgId);
  if (ownershipError) return ownershipError;

  try {
    const { searchParams } = new URL(request.url);
    const addressId = searchParams.get("addressId");

    if (!addressId) {
      return NextResponse.json(
        { error: "addressId query param is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.organizationAddress.findUnique({
      where: { id: parseInt(addressId) },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Address not found" },
        { status: 404 }
      );
    }

    if (existing.organizationId !== orgId) {
      return NextResponse.json(
        { error: "Address does not belong to this organization" },
        { status: 403 }
      );
    }

    await prisma.organizationAddress.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({ message: "Address deleted successfully" });
  } catch (error) {
    console.error("Failed to delete address:", error);
    return NextResponse.json(
      { error: "Failed to delete address" },
      { status: 500 }
    );
  }
}
