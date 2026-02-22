import { prisma } from "@/lib/prisma";
import type { PaymentChannel, Prisma } from "@/lib/generated/prisma";

/* ── Types ──────────────────────────────────────────────── */

export interface RecordPaymentInput {
  organizationId: string;
  bankAccountId?: string;
  amount: number;
  currency?: string;
  transactionRef?: string;
  paymentChannel: PaymentChannel;
  paidAt: Date;
  challanId?: number;
  rawPayload?: Record<string, unknown>;
}

export interface ReconcileInput {
  paymentRecordId: string;
  challanId: number;
  organizationId: string;
}

export interface ReverseInput {
  paymentRecordId: string;
  organizationId: string;
  reason: string;
}

export interface ReconciliationResult {
  paymentRecordId: string;
  challanId: number;
  challanStatus: string;
  newPaidAmount: number;
  ledgerEntryId: string;
}

/* ── Summary Helper ─────────────────────────────────────── */

type TxClient = Prisma.TransactionClient;

async function adjustSummary(
  tx: TxClient,
  studentId: number,
  organizationId: string,
  campusId: number,
  direction: "DEBIT" | "CREDIT",
  amount: number,
) {
  const debitInc = direction === "DEBIT" ? amount : 0;
  const creditInc = direction === "CREDIT" ? amount : 0;
  const balanceDelta = debitInc - creditInc;

  await tx.studentFinancialSummary.upsert({
    where: { studentId },
    create: {
      studentId,
      organizationId,
      campusId,
      totalDebit: debitInc,
      totalCredit: creditInc,
      balance: balanceDelta,
    },
    update: {
      totalDebit: { increment: debitInc },
      totalCredit: { increment: creditInc },
      balance: { increment: balanceDelta },
    },
  });
}

/* ── Record Payment ─────────────────────────────────────── */

export async function recordPayment(input: RecordPaymentInput) {
  const {
    organizationId,
    bankAccountId,
    amount,
    currency = "PKR",
    transactionRef,
    paymentChannel,
    paidAt,
    challanId,
    rawPayload,
  } = input;

  return prisma.paymentRecord.create({
    data: {
      organizationId,
      bankAccountId: bankAccountId ?? null,
      amount,
      currency,
      transactionRef: transactionRef ?? null,
      paymentChannel,
      paidAt,
      challanId: challanId ?? null,
      rawPayload: rawPayload ?? undefined,
    },
  });
}

/* ── Reconcile Payment → Challan ────────────────────────── */

export async function reconcilePayment(
  input: ReconcileInput,
): Promise<ReconciliationResult> {
  const { paymentRecordId, challanId, organizationId } = input;

  return prisma.$transaction(async (tx) => {
    const payment = await tx.paymentRecord.findUniqueOrThrow({
      where: { id: paymentRecordId },
    });

    if (payment.organizationId !== organizationId) {
      throw new ReconciliationError("Payment does not belong to this organization");
    }

    if (payment.status !== "PENDING") {
      throw new ReconciliationError(
        `Payment cannot be reconciled — current status: ${payment.status}`,
      );
    }

    const challan = await tx.feeChallan.findUniqueOrThrow({
      where: { id: challanId },
    });

    if (challan.organizationId !== organizationId) {
      throw new ReconciliationError("Challan does not belong to this organization");
    }

    if (challan.status === "CANCELLED") {
      throw new ReconciliationError("Cannot reconcile against a cancelled challan");
    }

    const paymentAmt = Number(payment.amount);
    const newPaidAmount = Number(challan.paidAmount) + paymentAmt;
    const isPaidInFull = newPaidAmount >= Number(challan.totalAmount);
    const newStatus = isPaidInFull ? ("PAID" as const) : ("PARTIALLY_PAID" as const);

    await tx.feeChallan.update({
      where: { id: challan.id },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus,
        paidAt: isPaidInFull ? new Date() : challan.paidAt,
      },
    });

    await tx.paymentRecord.update({
      where: { id: payment.id },
      data: {
        status: "RECONCILED",
        challanId: challan.id,
      },
    });

    const ledgerEntry = await tx.ledgerEntry.create({
      data: {
        organizationId,
        studentId: challan.studentId,
        campusId: challan.campusId,
        challanId: challan.id,
        entryType: "PAYMENT_RECEIVED",
        direction: "CREDIT",
        amount: paymentAmt,
        referenceId: payment.id,
        referenceType: "PaymentRecord",
      },
    });

    await adjustSummary(tx, challan.studentId, organizationId, challan.campusId, "CREDIT", paymentAmt);

    return {
      paymentRecordId: payment.id,
      challanId: challan.id,
      challanStatus: newStatus,
      newPaidAmount,
      ledgerEntryId: ledgerEntry.id,
    };
  });
}

/* ── Record + Reconcile (single-step OTC entry) ─────────── */

export async function recordAndReconcile(
  input: RecordPaymentInput & { challanId: number },
): Promise<ReconciliationResult> {
  const {
    organizationId,
    bankAccountId,
    amount,
    currency = "PKR",
    transactionRef,
    paymentChannel,
    paidAt,
    challanId,
    rawPayload,
  } = input;

  return prisma.$transaction(async (tx) => {
    const challan = await tx.feeChallan.findUniqueOrThrow({
      where: { id: challanId },
    });

    if (challan.organizationId !== organizationId) {
      throw new ReconciliationError("Challan does not belong to this organization");
    }

    if (challan.status === "CANCELLED") {
      throw new ReconciliationError("Cannot reconcile against a cancelled challan");
    }

    const payment = await tx.paymentRecord.create({
      data: {
        organizationId,
        bankAccountId: bankAccountId ?? null,
        amount,
        currency,
        transactionRef: transactionRef ?? null,
        paymentChannel,
        paidAt,
        challanId,
        status: "RECONCILED",
        rawPayload: rawPayload ?? undefined,
      },
    });

    const newPaidAmount = Number(challan.paidAmount) + amount;
    const isPaidInFull = newPaidAmount >= Number(challan.totalAmount);
    const newStatus = isPaidInFull ? ("PAID" as const) : ("PARTIALLY_PAID" as const);

    await tx.feeChallan.update({
      where: { id: challan.id },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus,
        paidAt: isPaidInFull ? new Date() : challan.paidAt,
      },
    });

    const ledgerEntry = await tx.ledgerEntry.create({
      data: {
        organizationId,
        studentId: challan.studentId,
        campusId: challan.campusId,
        challanId: challan.id,
        entryType: "PAYMENT_RECEIVED",
        direction: "CREDIT",
        amount,
        referenceId: payment.id,
        referenceType: "PaymentRecord",
      },
    });

    await adjustSummary(tx, challan.studentId, organizationId, challan.campusId, "CREDIT", amount);

    return {
      paymentRecordId: payment.id,
      challanId: challan.id,
      challanStatus: newStatus,
      newPaidAmount,
      ledgerEntryId: ledgerEntry.id,
    };
  });
}

/* ── Reverse Payment (Refund) ───────────────────────────── */

export async function reversePayment(
  input: ReverseInput,
): Promise<{ ledgerEntryId: string }> {
  const { paymentRecordId, organizationId, reason } = input;

  return prisma.$transaction(async (tx) => {
    const payment = await tx.paymentRecord.findUniqueOrThrow({
      where: { id: paymentRecordId },
    });

    if (payment.organizationId !== organizationId) {
      throw new ReconciliationError("Payment does not belong to this organization");
    }

    if (payment.status !== "RECONCILED") {
      throw new ReconciliationError(
        `Only reconciled payments can be reversed — current status: ${payment.status}`,
      );
    }

    await tx.paymentRecord.update({
      where: { id: payment.id },
      data: { status: "REFUNDED" },
    });

    let studentId: number | null = null;
    let campusId: number | null = null;

    if (payment.challanId) {
      const challan = await tx.feeChallan.findUniqueOrThrow({
        where: { id: payment.challanId },
      });

      studentId = challan.studentId;
      campusId = challan.campusId;

      const newPaidAmount = Math.max(Number(challan.paidAmount) - Number(payment.amount), 0);
      const newStatus = newPaidAmount > 0 ? ("PARTIALLY_PAID" as const) : ("UNPAID" as const);

      await tx.feeChallan.update({
        where: { id: challan.id },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
          paidAt: null,
        },
      });
    }

    const refundAmt = Number(payment.amount);

    const ledgerEntry = await tx.ledgerEntry.create({
      data: {
        organizationId,
        studentId,
        campusId,
        challanId: payment.challanId,
        entryType: "REFUND",
        direction: "DEBIT",
        amount: refundAmt,
        referenceId: payment.id,
        referenceType: "PaymentRecord",
        notes: reason,
      },
    });

    if (studentId && campusId) {
      await adjustSummary(tx, studentId, organizationId, campusId, "DEBIT", refundAmt);
    }

    return { ledgerEntryId: ledgerEntry.id };
  });
}

/* ── Mark Payment Failed ────────────────────────────────── */

export async function markPaymentFailed(
  paymentRecordId: string,
  organizationId: string,
  reason?: string,
) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.paymentRecord.findUniqueOrThrow({
      where: { id: paymentRecordId },
    });

    if (payment.organizationId !== organizationId) {
      throw new ReconciliationError("Payment does not belong to this organization");
    }

    if (payment.status !== "PENDING") {
      throw new ReconciliationError(
        `Only pending payments can be marked failed — current status: ${payment.status}`,
      );
    }

    return tx.paymentRecord.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        rawPayload: reason ? { failureReason: reason } : undefined,
      },
    });
  });
}

/* ── Custom Error ───────────────────────────────────────── */

export class ReconciliationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReconciliationError";
  }
}
