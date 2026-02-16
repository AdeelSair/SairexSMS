/**
 * Seed Script: Creates the root Organization, SUPER_ADMIN user,
 * primary contact, and head office address.
 *
 * Run with:  npx tsx scripts/seed-admin.ts
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("--- SAIREX SMS: Seeding Super Admin ---\n");

  // 1. Upsert the root organization
  const org = await prisma.organization.upsert({
    where: { slug: "sairex-hq" },
    update: {},
    create: {
      id: "ORG-00001",
      organizationName: "Sairex Headquarters",
      displayName: "Sairex HQ",
      slug: "sairex-hq",
      organizationType: "COMPANY",
      timeZone: "Asia/Karachi",
      defaultLanguage: "en",
      status: "ACTIVE",
    },
  });
  console.log(`Organization: "${org.organizationName}" (id: ${org.id})`);

  // 2. Hash the default password
  const defaultPassword = "Admin@123";
  const hashedPassword = await bcrypt.hash(defaultPassword, 12);

  // 3. Upsert the SUPER_ADMIN user
  const admin = await prisma.user.upsert({
    where: { email: "admin@sairex-sms.com" },
    update: { password: hashedPassword },
    create: {
      email: "admin@sairex-sms.com",
      password: hashedPassword,
      role: "SUPER_ADMIN",
      organizationId: org.id,
      isActive: true,
    },
  });
  console.log(`Super Admin : ${admin.email} (id: ${admin.id})`);

  // 4. Seed a primary contact (skip if one already exists)
  const existingContact = await prisma.organizationContact.findFirst({
    where: { organizationId: org.id, isPrimary: true },
  });

  if (!existingContact) {
    const contact = await prisma.organizationContact.create({
      data: {
        organizationId: org.id,
        contactName: "Adeel Ahmed",
        designation: "System Administrator",
        primaryPhone: "+923001234567",
        primaryEmail: "admin@sairex-sms.com",
        isPrimary: true,
      },
    });
    console.log(`Contact     : ${contact.contactName} (primary)`);
  } else {
    console.log(`Contact     : Primary contact already exists (id: ${existingContact.id})`);
  }

  // 5. Seed a head office address (skip if one already exists)
  const existingAddress = await prisma.organizationAddress.findFirst({
    where: { organizationId: org.id, addressType: "HEAD_OFFICE", isPrimary: true },
  });

  if (!existingAddress) {
    const address = await prisma.organizationAddress.create({
      data: {
        organizationId: org.id,
        addressType: "HEAD_OFFICE",
        country: "PK",
        provinceState: "Punjab",
        city: "Lahore",
        addressLine1: "123 Main Boulevard, DHA Phase 5",
        postalCode: "54000",
        isPrimary: true,
      },
    });
    console.log(`Address     : ${address.city}, ${address.provinceState} (HEAD_OFFICE)`);
  } else {
    console.log(`Address     : Head office address already exists (id: ${existingAddress.id})`);
  }

  console.log("\n========================================");
  console.log("  LOGIN CREDENTIALS");
  console.log("========================================");
  console.log(`  Email    : admin@sairex-sms.com`);
  console.log(`  Password : ${defaultPassword}`);
  console.log("========================================");
  console.log("\n  Change this password after first login!\n");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
