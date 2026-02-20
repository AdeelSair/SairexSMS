import { Worker, Job as BullJob } from "bullmq";
import { getRedisConnection } from "../connection";
import { OTP_QUEUE } from "../queues";

export interface OtpJobData {
  jobId: string;
  channel: "email" | "mobile" | "whatsapp";
  target: string;
  code: string;
}

async function processOtpJob(bull: BullJob<OtpJobData>): Promise<void> {
  const { prisma } = await import("@/lib/prisma");
  const { sendEmail } = await import("@/lib/email");

  const { jobId, channel, target, code } = bull.data;

  await prisma.job.update({
    where: { id: jobId },
    data: { status: "PROCESSING", startedAt: new Date(), attempts: bull.attemptsMade + 1 },
  });

  try {
    let success = false;

    if (channel === "email") {
      success = await sendEmail({
        to: target,
        subject: "Your verification code — SAIREX SMS",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #1e40af;">SAIREX SMS</h2>
            <p>Your verification code is:</p>
            <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 24px 0; color: #1e40af;">${code}</p>
            <p style="color: #64748b; font-size: 14px;">
              This code expires in 10 minutes. If you didn't request this, ignore this message.
            </p>
          </div>
        `,
      });
    } else if (channel === "mobile") {
      const hash = process.env.VEEVO_HASH;
      const sender = process.env.VEEVO_SENDER;

      if (!hash || !sender) {
        console.log(`[OTP Worker] DEV MODE — SMS → ${target}: ${code}`);
        success = true;
      } else {
        const axios = (await import("axios")).default;
        const msg = `Your SAIREX SMS verification code is: ${code}. Valid for 10 minutes.`;
        const url = `https://api.veevotech.com/sendsms?hash=${hash}&receivenum=${encodeURIComponent(target)}&sendernum=${encodeURIComponent(sender)}&textmessage=${encodeURIComponent(msg)}`;
        const res = await axios.get(url);
        success = res.status === 200;
      }
    } else if (channel === "whatsapp") {
      const { sendWhatsAppMessage } = await import("@/lib/whatsapp");
      try {
        await sendWhatsAppMessage(target, `Your SAIREX SMS verification code is: ${code}`);
        success = true;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown WhatsApp error";
        if (errorMsg.includes("init") || errorMsg.includes("not ready")) {
          console.log(`[OTP Worker] DEV MODE — WhatsApp → ${target}: ${code}`);
          success = true;
        } else {
          throw err;
        }
      }
    }

    if (!success) {
      throw new Error(`OTP delivery failed via ${channel} to ${target}`);
    }

    await prisma.job.update({
      where: { id: jobId },
      data: { status: "COMPLETED", completedAt: new Date(), error: null },
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown OTP error";
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: bull.attemptsMade + 1 >= (bull.opts.attempts ?? 3) ? "DEAD" : "FAILED",
        failedAt: new Date(),
        error: errorMsg,
      },
    });
    throw new Error(`OTP delivery failed to ${target}: ${errorMsg}`);
  }
}

export function startOtpWorker(): Worker<OtpJobData> {
  const worker = new Worker<OtpJobData>(OTP_QUEUE, processOtpJob, {
    connection: getRedisConnection(),
    concurrency: 3,
    limiter: { max: 5, duration: 1000 },
  });

  worker.on("completed", (job) => {
    console.log(`[OTP Worker] completed ${job.id} → ${job.data.channel}:${job.data.target}`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[OTP Worker] failed ${job?.id} → ${err.message}`);
  });

  console.log("[OTP Worker] Started — listening on queue:", OTP_QUEUE);
  return worker;
}
