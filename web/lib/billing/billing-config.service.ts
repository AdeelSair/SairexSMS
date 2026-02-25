import { prisma } from "@/lib/prisma";
import { TRIAL_POLICY, createTrialWindow } from "@/lib/billing/pricing-architecture";

export interface BillingConfig {
  organizationId: string;
  perStudentFee: number;
  revenueCalculationMode: "ON_GENERATED_FEE" | "ON_COLLECTED_FEE";
  closingDay: number;
}

export async function getOrganizationBillingConfig(
  organizationId: string,
): Promise<BillingConfig> {
  const plan = await prisma.organizationPlan.findUnique({
    where: { organizationId },
    select: {
      organizationId: true,
      perStudentFee: true,
      revenueCalculationMode: true,
      closingDay: true,
    },
  });

  return {
    organizationId,
    perStudentFee: Number(plan?.perStudentFee ?? 0),
    revenueCalculationMode: (plan?.revenueCalculationMode ?? "ON_GENERATED_FEE"),
    closingDay: plan?.closingDay ?? 10,
  };
}

export async function updateOrganizationBillingConfig(input: {
  organizationId: string;
  perStudentFee: number;
  revenueCalculationMode: "ON_GENERATED_FEE" | "ON_COLLECTED_FEE";
  closingDay: number;
  changedByUserId: number;
  changedByEmail: string;
}): Promise<BillingConfig> {
  const previous = await getOrganizationBillingConfig(input.organizationId);
  const trial = createTrialWindow();

  const updated = await prisma.organizationPlan.upsert({
    where: { organizationId: input.organizationId },
    create: {
      organizationId: input.organizationId,
      perStudentFee: input.perStudentFee,
      revenueCalculationMode: input.revenueCalculationMode,
      closingDay: input.closingDay,
      planType: "FREE",
      active: true,
      trialPlanType: TRIAL_POLICY.trialPlanType,
      trialStartedAt: trial.trialStartedAt,
      trialEndsAt: trial.trialEndsAt,
    },
    update: {
      perStudentFee: input.perStudentFee,
      revenueCalculationMode: input.revenueCalculationMode,
      closingDay: input.closingDay,
    },
    select: {
      organizationId: true,
      perStudentFee: true,
      revenueCalculationMode: true,
      closingDay: true,
    },
  });

  await prisma.domainEventLog.create({
    data: {
      organizationId: input.organizationId,
      eventType: "OrganizationBillingConfigUpdated",
      payload: {
        oldValue: previous,
        newValue: {
          perStudentFee: input.perStudentFee,
          revenueCalculationMode: input.revenueCalculationMode,
          closingDay: input.closingDay,
        },
        changedBy: input.changedByEmail,
        changedByUserId: input.changedByUserId,
        changedAt: new Date().toISOString(),
      },
      occurredAt: new Date(),
      initiatedByUserId: input.changedByUserId,
    },
  });

  return {
    organizationId: updated.organizationId,
    perStudentFee: Number(updated.perStudentFee),
    revenueCalculationMode: updated.revenueCalculationMode,
    closingDay: updated.closingDay,
  };
}

