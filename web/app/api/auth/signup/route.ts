import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { generateOrganizationId } from "@/lib/id-generators";

/**
 * POST /api/auth/signup
 *
 * Two modes:
 *   1. No invite token → Creates a new Organization + User as ORG_ADMIN
 *   2. With invite token → Creates a User under the invited org with the assigned role
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fullName, email, password, inviteToken, orgName, orgType } = body;

    // --- Shared validation ---
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Check if email is already registered
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // ─── MODE 1: Invited user (token present) ───
    if (inviteToken) {
      const invite = await prisma.inviteToken.findUnique({
        where: { token: inviteToken },
        include: { organization: true },
      });

      if (!invite) {
        return NextResponse.json(
          { error: "Invalid invite link" },
          { status: 400 }
        );
      }

      if (invite.usedAt) {
        return NextResponse.json(
          { error: "This invite has already been used" },
          { status: 400 }
        );
      }

      if (new Date() > invite.expiresAt) {
        return NextResponse.json(
          { error: "This invite has expired. Please ask your admin for a new one." },
          { status: 400 }
        );
      }

      // Verify the email matches the invite
      if (invite.email.toLowerCase() !== email.toLowerCase()) {
        return NextResponse.json(
          { error: "This invite was sent to a different email address" },
          { status: 403 }
        );
      }

      // Create user under the invited org + mark invite as used
      const [user] = await prisma.$transaction([
        prisma.user.create({
          data: {
            email: invite.email.toLowerCase(),
            password: hashedPassword,
            role: invite.role,
            organizationId: invite.organizationId,
            isActive: true,
          },
        }),
        prisma.inviteToken.update({
          where: { id: invite.id },
          data: { usedAt: new Date() },
        }),
      ]);

      return NextResponse.json(
        {
          message: "Account created successfully",
          user: { id: user.id, email: user.email, role: user.role },
          organizationName: invite.organization.organizationName,
        },
        { status: 201 }
      );
    }

    // ─── MODE 2: New organization signup (no token) ───
    if (!orgName) {
      return NextResponse.json(
        { error: "Organization name is required" },
        { status: 400 }
      );
    }

    // Auto-generate slug from org name
    const slug = orgName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Check if slug is taken
    const existingOrg = await prisma.organization.findUnique({
      where: { slug },
    });

    if (existingOrg) {
      return NextResponse.json(
        { error: "An organization with a similar name already exists. Please choose a different name." },
        { status: 409 }
      );
    }

    // Create org + user in a single transaction
    const orgId = await generateOrganizationId();

    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          id: orgId,
          organizationName: orgName,
          displayName: orgName,
          slug,
          organizationType: orgType || "SCHOOL",
          status: "PENDING",
        },
      });

      const user = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          role: "ORG_ADMIN",
          organizationId: org.id,
          isActive: true,
        },
      });

      return { org, user };
    });

    return NextResponse.json(
      {
        message: "Organization and account created successfully",
        user: {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
        },
        organizationName: result.org.organizationName,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
