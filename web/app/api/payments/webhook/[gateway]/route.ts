import { NextResponse } from "next/server";
import { enqueue, WEBHOOK_QUEUE } from "@/lib/queue";
import type { PaymentGateway } from "@/lib/generated/prisma";

const VALID_GATEWAYS: Set<string> = new Set([
  "EASYPAISA", "JAZZCASH", "ONEBILL", "KUICKPAY", "STRIPE",
]);

/**
 * POST /api/payments/webhook/:gateway
 *
 * Public endpoint — receives payment gateway callbacks.
 * Validates basic structure then pushes to the webhook queue
 * for async processing. Returns 200 immediately to satisfy
 * gateway retry policies.
 *
 * Signature verification happens inside the queue worker,
 * not in the HTTP thread.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ gateway: string }> },
) {
  const { gateway } = await params;
  const gatewayUpper = gateway.toUpperCase();

  if (!VALID_GATEWAYS.has(gatewayUpper)) {
    return NextResponse.json({ error: "Unknown gateway" }, { status: 404 });
  }

  try {
    const payload = await request.json();

    const signature =
      request.headers.get("x-signature") ??
      request.headers.get("x-webhook-signature") ??
      request.headers.get("stripe-signature") ??
      null;

    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const jobId = await enqueue({
      type: "WEBHOOK_CALLBACK",
      queue: WEBHOOK_QUEUE,
      payload: {
        gateway: gatewayUpper as PaymentGateway,
        payload,
        signature,
        headers,
        receivedAt: new Date().toISOString(),
      },
      maxAttempts: 3,
    });

    return NextResponse.json({
      received: true,
      jobId,
      gateway: gatewayUpper,
    });
  } catch (err) {
    console.error(`[Webhook ${gatewayUpper}] Error:`, err);
    return NextResponse.json({ received: false, error: "Parse error" }, { status: 400 });
  }
}
