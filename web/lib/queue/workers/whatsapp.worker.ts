import { Worker, Job as BullJob } from "bullmq";
import { getRedisConnection } from "../connection";
import { WHATSAPP_QUEUE } from "../queues";

export interface WhatsAppJobData {
  jobId: string;
  to: string;
  message: string;
}

async function processWhatsAppJob(bull: BullJob<WhatsAppJobData>): Promise<void> {
  const { prisma } = await import("@/lib/prisma");

  const { jobId, to, message } = bull.data;

  await prisma.job.update({
    where: { id: jobId },
    data: { status: "PROCESSING", startedAt: new Date(), attempts: bull.attemptsMade + 1 },
  });

  try {
    const { sendWhatsAppMessage } = await import("@/lib/whatsapp");
    await sendWhatsAppMessage(to, message);

    await prisma.job.update({
      where: { id: jobId },
      data: { status: "COMPLETED", completedAt: new Date(), error: null },
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown WhatsApp error";

    // If WhatsApp client isn't initialized, log gracefully in dev
    if (errorMsg.includes("init") || errorMsg.includes("not ready")) {
      console.log(`[WhatsApp Worker] DEV MODE — WhatsApp → ${to}: ${message}`);
      await prisma.job.update({
        where: { id: jobId },
        data: { status: "COMPLETED", completedAt: new Date(), error: null, result: { devMode: true } },
      });
      return;
    }

    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: bull.attemptsMade + 1 >= (bull.opts.attempts ?? 3) ? "DEAD" : "FAILED",
        failedAt: new Date(),
        error: errorMsg,
      },
    });
    throw new Error(`WhatsApp delivery failed to ${to}: ${errorMsg}`);
  }
}

export function startWhatsAppWorker(): Worker<WhatsAppJobData> {
  const worker = new Worker<WhatsAppJobData>(WHATSAPP_QUEUE, processWhatsAppJob, {
    connection: getRedisConnection(),
    concurrency: 1,
    limiter: { max: 1, duration: 2000 },
  });

  worker.on("completed", (job) => {
    console.log(`[WhatsApp Worker] completed ${job.id} → ${job.data.to}`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[WhatsApp Worker] failed ${job?.id} → ${err.message}`);
  });

  console.log("[WhatsApp Worker] Started — listening on queue:", WHATSAPP_QUEUE);
  return worker;
}
