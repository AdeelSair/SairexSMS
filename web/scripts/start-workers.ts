/**
 * Standalone worker process — run with:
 *   npx tsx scripts/start-workers.ts
 *
 * In production, run this as a separate process alongside `next start`.
 */
import { startWorkers } from "../lib/queue/workers";

startWorkers();

process.on("SIGINT", () => {
  console.log("\n[Workers] Shutting down…");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n[Workers] Shutting down…");
  process.exit(0);
});

console.log("[Workers] Running. Press Ctrl+C to stop.");
