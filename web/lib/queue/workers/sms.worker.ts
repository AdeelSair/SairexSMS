import { Worker, Job as BullJob } from "bullmq";
import { getRedisConnection } from "../connection";
import { SMS_QUEUE } from "../queues";

export interface SmsJobData {
  jobId: string;
  to: string;
  message: string;
}

async function processSmsJob(bull: BullJob<SmsJobData>): Promise<void> {
  const { prisma } = await import("@/lib/prisma");
  const axios = (await import("axios")).default;

  const { jobId, to, message } = bull.data;

  await prisma.job.update({
    where: { id: jobId },
    data: { status: "PROCESSING", startedAt: new Date(), attempts: bull.attemptsMade + 1 },
  });

  try {
    const hash = process.env.VEEVO_HASH;
    const sender = process.env.VEEVO_SENDER;

    if (!hash || !sender) {
      console.log(`[SMS Worker] DEV MODE — SMS → ${to}: ${message}`);
    } else {
      const url = `https://api.veevotech.com/sendsms?hash=${hash}&receivenum=${to}&sendernum=${sender}&textmessage=${encodeURIComponent(message)}`;
      await axios.get(url);
    }

    await prisma.job.update({
      where: { id: jobId },
      data: { status: "COMPLETED", completedAt: new Date(), error: null },
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown SMS error";
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: bull.attemptsMade + 1 >= (bull.opts.attempts ?? 3) ? "DEAD" : "FAILED",
        failedAt: new Date(),
        error: errorMsg,
      },
    });
    throw new Error(`SMS delivery failed to ${to}: ${errorMsg}`);
  }
}

export function startSmsWorker(): Worker<SmsJobData> {
  const worker = new Worker<SmsJobData>(SMS_QUEUE, processSmsJob, {
    connection: getRedisConnection(),
    concurrency: 3,
    limiter: { max: 5, duration: 1000 },
  });

  worker.on("completed", (job) => {
    console.log(`[SMS Worker] completed ${job.id} → ${job.data.to}`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[SMS Worker] failed ${job?.id} → ${err.message}`);
  });

  console.log("[SMS Worker] Started — listening on queue:", SMS_QUEUE);
  return worker;
}
