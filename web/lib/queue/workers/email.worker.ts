import { Worker, Job as BullJob } from "bullmq";
import { getRedisConnection } from "../connection";
import { EMAIL_QUEUE } from "../queues";

export interface EmailJobData {
  jobId: string;
  to: string;
  subject: string;
  html: string;
}

async function processEmailJob(bull: BullJob<EmailJobData>): Promise<void> {
  const { prisma } = await import("@/lib/prisma");
  const { sendEmail } = await import("@/lib/email");

  const { jobId, to, subject, html } = bull.data;

  await prisma.job.update({
    where: { id: jobId },
    data: { status: "PROCESSING", startedAt: new Date(), attempts: bull.attemptsMade + 1 },
  });

  const success = await sendEmail({ to, subject, html });

  if (!success) {
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: bull.attemptsMade + 1 >= (bull.opts.attempts ?? 3) ? "DEAD" : "FAILED",
        failedAt: new Date(),
        error: `Email delivery failed to ${to}`,
      },
    });
    throw new Error(`Email delivery failed to ${to}`);
  }

  await prisma.job.update({
    where: { id: jobId },
    data: { status: "COMPLETED", completedAt: new Date(), error: null },
  });
}

export function startEmailWorker(): Worker<EmailJobData> {
  const worker = new Worker<EmailJobData>(EMAIL_QUEUE, processEmailJob, {
    connection: getRedisConnection(),
    concurrency: 5,
    limiter: { max: 10, duration: 1000 },
  });

  worker.on("completed", (job) => {
    console.log(`[Email Worker] completed ${job.id} → ${job.data.to}`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Email Worker] failed ${job?.id} → ${err.message}`);
  });

  console.log("[Email Worker] Started — listening on queue:", EMAIL_QUEUE);
  return worker;
}
