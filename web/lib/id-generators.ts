import { prisma } from "./prisma";

/**
 * Generates the next Organization ID in the format ORG-XXXXX.
 *
 * Strategy:
 *   1. Query the highest existing ID from the Organization table.
 *   2. Extract the numeric portion, increment by 1.
 *   3. Pad to 5 digits and return "ORG-00001", "ORG-00002", etc.
 *
 * Handles: empty table (starts at 00001), gaps in sequence (always uses MAX).
 *
 * Note: For high-concurrency environments, wrap the create operation
 * in a transaction with a serializable isolation level or use a
 * database sequence to avoid race conditions.
 */
export async function generateOrganizationId(): Promise<string> {
  const PREFIX = "ORG";
  const PAD_LENGTH = 5;

  const lastOrg = await prisma.organization.findFirst({
    orderBy: { id: "desc" },
    select: { id: true },
  });

  let nextNumber = 1;

  if (lastOrg) {
    const numericPart = lastOrg.id.replace(`${PREFIX}-`, "");
    const parsed = parseInt(numericPart, 10);
    if (!isNaN(parsed)) {
      nextNumber = parsed + 1;
    }
  }

  const paddedNumber = String(nextNumber).padStart(PAD_LENGTH, "0");
  return `${PREFIX}-${paddedNumber}`;
}
