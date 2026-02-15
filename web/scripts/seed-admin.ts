/**
 * Seed Script: Creates the root Organization and SUPER_ADMIN user.
 * Run with:  npx tsx scripts/seed-admin.ts
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("--- SAIREX SMS: Seeding Super Admin ---\n");

  // 1. Upsert the root organization
  const org = await prisma.organization.upsert({
    where: { orgCode: "SAIREX-HQ" },
    update: {},
    create: {
      name: "Sairex Headquarters",
      orgCode: "SAIREX-HQ",
      subscriptionPlan: "ENTERPRISE",
      subscriptionStatus: "ACTIVE",
    },
  });
  console.log(`Organization: "${org.name}" (id: ${org.id})`);

  // 2. Hash the default password
  const defaultPassword = "Admin@123";
  const hashedPassword = await bcrypt.hash(defaultPassword, 12);

  // 3. Upsert the SUPER_ADMIN user
  const admin = await prisma.user.upsert({
    where: { email: "admin@sairex-sms.com" },
    update: {},
    create: {
      email: "admin@sairex-sms.com",
      password: hashedPassword,
      role: "SUPER_ADMIN",
      organizationId: org.id,
      isActive: true,
    },
  });
  console.log(`Super Admin : ${admin.email} (id: ${admin.id})`);

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
