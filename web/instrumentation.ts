/**
 * Next.js Instrumentation Hook
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * Runs once when the Next.js server starts. We use this to boot
 * background workers in-process during development.
 * In production, workers should run as a separate process.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl && process.env.NODE_ENV === "production") {
      console.warn("[Workers] REDIS_URL not set — skipping worker bootstrap");
      return;
    }

    try {
      const { startWorkers } = await import("./lib/queue/workers");
      startWorkers();
    } catch (err) {
      console.error("[Workers] Failed to start:", err);
    }
  }
}
