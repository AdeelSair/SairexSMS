/**
 * Standalone worker process — run with:
 *   npx tsx scripts/start-workers.ts
 *
 * In production, run this as a separate process alongside `next start`.
 *
 * Production topology:
 *   API server:    next start         (2+ pods)
 *   Worker:        tsx start-workers  (1–4 pods, scale independently)
 *   Redis:         managed instance
 */
import { startWorkers } from "../lib/queue/workers";
import { enqueue, SYSTEM_QUEUE } from "../lib/queue";
import { initializeEventHandlers } from "../lib/events";

const RECOVERY_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let recoveryTimer: ReturnType<typeof setInterval> | null = null;

async function scheduleRecoverySweep() {
  try {
    await enqueue({
      type: "RECOVERY_SWEEP",
      queue: SYSTEM_QUEUE,
      payload: {},
      idempotencyKey: `recovery-sweep-${Date.now()}`,
    });
  } catch (err) {
    console.error("[Recovery] Failed to schedule sweep:", err);
  }
}

function shutdown() {
  console.log("\n[Workers] Shutting down…");
  if (recoveryTimer) clearInterval(recoveryTimer);
  setTimeout(() => process.exit(0), 3000);
}

initializeEventHandlers();
startWorkers();

recoveryTimer = setInterval(scheduleRecoverySweep, RECOVERY_INTERVAL_MS);
console.log(`[Workers] Recovery sweep scheduled every ${RECOVERY_INTERVAL_MS / 1000}s`);

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log("[Workers] Running. Press Ctrl+C to stop.");
