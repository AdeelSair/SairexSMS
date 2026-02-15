import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/auth-guard";
import crypto from "crypto";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.titan.email",
  port: Number(process.env.SMTP_PORT || 465),
  secure: Number(process.env.SMTP_PORT || 465) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// GET: List users, pending invites, and org/campus options for dropdowns
export async function GET() {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  const denied = requireRole(guard, "SUPER_ADMIN", "ORG_ADMIN");
  if (denied) return denied;

  try {
    const isSuperAdmin = guard.role === "SUPER_ADMIN";
    const where = isSuperAdmin ? {} : { organizationId: guard.organizationId };

    const [users, invites, organizations, regions, campuses] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          campusId: true,
          organization: { select: { id: true, name: true } },
          campus: { select: { id: true, name: true, regionId: true } },
        },
        orderBy: { id: "desc" },
      }),
      prisma.inviteToken.findMany({
        where: {
          ...where,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        select: {
          id: true,
          email: true,
          role: true,
          expiresAt: true,
          createdBy: true,
          createdAt: true,
          organization: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      // Orgs dropdown (SUPER_ADMIN sees all, ORG_ADMIN sees own)
      isSuperAdmin
        ? prisma.organization.findMany({
            select: { id: true, name: true },
            orderBy: { name: "asc" },
          })
        : prisma.organization.findMany({
            where: { id: guard.organizationId },
            select: { id: true, name: true },
          }),
      // Regions dropdown (scoped to org)
      prisma.regionalOffice.findMany({
        where,
        select: { id: true, name: true, city: true, organizationId: true },
        orderBy: { name: "asc" },
      }),
      // Campuses dropdown (scoped to org, includes regionId)
      prisma.campus.findMany({
        where,
        select: { id: true, name: true, organizationId: true, regionId: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({
      users,
      pendingInvites: invites,
      organizations,
      regions,
      campuses,
      isSuperAdmin,
    });
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// POST: Send an invite (SUPER_ADMIN can pick org, ORG_ADMIN uses own)
export async function POST(request: Request) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  const denied = requireRole(guard, "SUPER_ADMIN", "ORG_ADMIN");
  if (denied) return denied;

  try {
    const { email, role, organizationId } = await request.json();

    if (!email || !role) {
      return NextResponse.json(
        { error: "Email and role are required" },
        { status: 400 }
      );
    }

    const allowedRoles = ["ORG_ADMIN", "CAMPUS_ADMIN", "TEACHER", "PARENT"];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Allowed: ${allowedRoles.join(", ")}` },
        { status: 400 }
      );
    }

    // Determine target org
    const targetOrgId =
      guard.role === "SUPER_ADMIN" && organizationId
        ? parseInt(organizationId)
        : guard.organizationId;

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    // Invalidate any previous unused invites for this email in this org
    await prisma.inviteToken.updateMany({
      where: {
        email: email.toLowerCase(),
        organizationId: targetOrgId,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    // Create invite token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.inviteToken.create({
      data: {
        email: email.toLowerCase(),
        role,
        organizationId: targetOrgId,
        token,
        expiresAt,
        createdBy: guard.email,
      },
    });

    // Build invite URL
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const inviteUrl = `${baseUrl}/signup?invite=${token}`;

    // Send invite email
    try {
      await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME || "SAIREX SMS"}" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "You're invited to SAIREX SMS",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #1e40af;">SAIREX SMS</h2>
            <p>You've been invited to join as <strong>${role.replace("_", " ")}</strong>.</p>
            <p style="margin: 24px 0;">
              <a href="${inviteUrl}" 
                 style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                Accept Invite
              </a>
            </p>
            <p style="color: #64748b; font-size: 14px;">
              This invite expires in 7 days. If you didn't expect this, ignore this email.
            </p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("Failed to send invite email:", emailErr);
    }

    return NextResponse.json(
      {
        message: `Invite sent to ${email}`,
        inviteUrl,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Invite error:", error);
    return NextResponse.json(
      { error: "Failed to send invite" },
      { status: 500 }
    );
  }
}

// PUT: Toggle user active/inactive (lock/unlock)
export async function PUT(request: Request) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  const denied = requireRole(guard, "SUPER_ADMIN", "ORG_ADMIN");
  if (denied) return denied;

  try {
    const { userId, isActive } = await request.json();

    if (!userId || typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "userId and isActive (boolean) are required" },
        { status: 400 }
      );
    }

    // Fetch the target user
    const targetUser = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Prevent self-deactivation
    if (targetUser.email === guard.email) {
      return NextResponse.json(
        { error: "You cannot deactivate your own account" },
        { status: 400 }
      );
    }

    // Tenant boundary: ORG_ADMIN can only manage users in their org
    if (
      guard.role !== "SUPER_ADMIN" &&
      targetUser.organizationId !== guard.organizationId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prevent non-SUPER_ADMIN from deactivating SUPER_ADMIN
    if (targetUser.role === "SUPER_ADMIN" && guard.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Only SUPER_ADMIN can manage other SUPER_ADMIN accounts" },
        { status: 403 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { isActive },
    });

    return NextResponse.json({
      message: `User ${isActive ? "activated" : "deactivated"} successfully`,
      user: { id: updated.id, email: updated.email, isActive: updated.isActive },
    });
  } catch (error) {
    console.error("Toggle user error:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}
