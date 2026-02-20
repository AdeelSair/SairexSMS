import { Queue } from "bullmq";
import { getRedisConnection } from "./connection";

const queues = new Map<string, Queue>();

export function getQueue(name: string): Queue {
  const existing = queues.get(name);
  if (existing) return existing;

  const queue = new Queue(name, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: { age: 7 * 24 * 3600, count: 1000 },
      removeOnFail: { age: 30 * 24 * 3600, count: 5000 },
    },
  });

  queues.set(name, queue);
  return queue;
}

export const EMAIL_QUEUE = "email";
export const OTP_QUEUE = "otp";
export const SMS_QUEUE = "sms";
export const WHATSAPP_QUEUE = "whatsapp";
export const NOTIFICATION_QUEUE = "notification";
export const CHALLAN_PDF_QUEUE = "challan-pdf";
export const REPORT_QUEUE = "report";
export const BULK_SMS_QUEUE = "bulk-sms";
export const IMPORT_QUEUE = "import";
