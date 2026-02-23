import { Worker, Job as BullJob } from "bullmq";
import { getRedisConnection } from "../connection";
import { REMINDER_QUEUE } from "../queues";
import { startJob, completeJob, failJob, updateJobProgress } from "../enqueue";

/* ── Job Data Types ────────────────────────────────────── */

export interface ReminderRunJobData {
  jobId: string;
  organizationId: string;
  unitPath?: string | null;
  campusId?: number;
}

/* ── Processor ─────────────────────────────────────────── */

async function processReminderJob(bull: BullJob<ReminderRunJobData>): Promise<void> {
  const { jobId, organizationId, unitPath, campusId } = bull.data;

  await startJob(jobId, bull.attemptsMade + 1);
  await updateJobProgress(jobId, 5);

  const { runReminderEngine } = await import("@/lib/finance/reminder-engine.service");

  const result = await runReminderEngine({
    organizationId,
    unitPath,
    campusId,
  });

  await completeJob(jobId, {
    processed: result.processed,
    sent: result.sent,
    skipped: result.skipped,
    failed: result.failed,
    errorCount: result.errors.length,
  });
}

/* ── Worker Bootstrap ──────────────────────────────────── */

export function startReminderWorker(): Worker<ReminderRunJobData> {
  const worker = new Worker<ReminderRunJobData>(REMINDER_QUEUE, processReminderJob, {
    connection: getRedisConnection(),
    concurrency: 3,
    limiter: { max: 50, duration: 1000 },
  });

  worker.on("completed", (job) => {
    console.log(`[Reminder Worker] completed ${job.id} → org ${job.data.organizationId}`);
  });

  worker.on("failed", async (job, err) => {
    console.error(`[Reminder Worker] failed ${job?.id} → ${err.message}`);
    if (job?.data?.jobId) {
      await failJob(
        job.data.jobId,
        err.message,
        job.attemptsMade,
        job.opts.attempts ?? 5,
      );
    }
  });

  console.log("[Reminder Worker] Started — listening on queue:", REMINDER_QUEUE);
  return worker;
}
