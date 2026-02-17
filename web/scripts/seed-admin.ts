/**
 * Seed Script: Creates the root Organization, SUPER_ADMIN user + Membership,
 * primary contact, head office address, and organization ID sequence.
 *
 * Run with:  npx tsx scripts/seed-admin.ts
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("--- SAIREX SMS: Seeding Super Admin ---\n");

  // 0. Initialize the Organization ID sequence
  await prisma.organizationSequence.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, lastValue: 1 },
  });
  console.log("Sequence    : OrganizationSequence initialized (lastValue: 1)");

  // 1. Hash the default password
  const defaultPassword = "Admin@123";
  const hashedPassword = await bcrypt.hash(defaultPassword, 12);

  // 2. Upsert the SUPER_ADMIN user (global identity with platformRole)
  //    Platform admins are pre-verified and active.
  const admin = await prisma.user.upsert({
    where: { email: "admin@sairex-sms.com" },
    update: { password: hashedPassword, platformRole: "SUPER_ADMIN" },
    create: {
      name: "System Administrator",
      email: "admin@sairex-sms.com",
      password: hashedPassword,
      isActive: true,
      emailVerifiedAt: new Date(),
      platformRole: "SUPER_ADMIN",
    },
  });
  console.log(`Super Admin : ${admin.email} (id: ${admin.id}, platformRole: ${admin.platformRole})`);

  // 3. Upsert the root organization
  const org = await prisma.organization.upsert({
    where: { slug: "sairex-hq" },
    update: {},
    create: {
      id: "ORG-00001",
      organizationName: "Sairex Headquarters",
      displayName: "Sairex HQ",
      slug: "sairex-hq",
      organizationType: "ACADEMY",
      timeZone: "Asia/Karachi",
      defaultLanguage: "en",
      status: "ACTIVE",
      onboardingStep: "COMPLETED",
      createdByUserId: admin.id,
    },
  });
  console.log(`Organization: "${org.organizationName}" (id: ${org.id})`);

  // 4. Create Membership (User <-> Organization with ORG_ADMIN role)
  const membership = await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: admin.id,
        organizationId: org.id,
      },
    },
    update: { role: "ORG_ADMIN", status: "ACTIVE" },
    create: {
      userId: admin.id,
      organizationId: org.id,
      role: "ORG_ADMIN",
      status: "ACTIVE",
    },
  });
  console.log(`Membership  : ${membership.role} in ${org.displayName}`);

  // 5. Seed a primary contact (skip if one already exists)
  const existingContact = await prisma.organizationContact.findFirst({
    where: { organizationId: org.id, isPrimary: true },
  });

  if (!existingContact) {
    const contact = await prisma.organizationContact.create({
      data: {
        organizationId: org.id,
        name: "Adeel Ahmed",
        designation: "System Administrator",
        phone: "+923001234567",
        email: "admin@sairex-sms.com",
        isPrimary: true,
      },
    });
    console.log(`Contact     : ${contact.name} (primary)`);
  } else {
    console.log(
      `Contact     : Primary contact already exists (id: ${existingContact.id})`,
    );
  }

  // 6. Seed a head office address (skip if one already exists)
  const existingAddress = await prisma.organizationAddress.findFirst({
    where: {
      organizationId: org.id,
      type: "HEAD_OFFICE",
      isPrimary: true,
    },
  });

  if (!existingAddress) {
    const address = await prisma.organizationAddress.create({
      data: {
        organizationId: org.id,
        type: "HEAD_OFFICE",
        country: "Pakistan",
        province: "Punjab",
        city: "Lahore",
        addressLine1: "123 Main Boulevard, DHA Phase 5",
        postalCode: "54000",
        isPrimary: true,
      },
    });
    console.log(
      `Address     : ${address.city}, ${address.province} (HEAD_OFFICE)`,
    );
  } else {
    console.log(
      `Address     : Head office address already exists (id: ${existingAddress.id})`,
    );
  }

  console.log("\n========================================");
  console.log("  LOGIN CREDENTIALS");
  console.log("========================================");
  console.log(`  Email    : admin@sairex-sms.com`);
  console.log(`  Password : ${defaultPassword}`);
  console.log(`  Platform : SUPER_ADMIN`);
  console.log("========================================");
  console.log("\n  Change this password after first login!\n");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
