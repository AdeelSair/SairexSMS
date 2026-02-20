import { prisma } from "@/lib/prisma";
import { getQueue } from "./queues";
import type { JobsOptions } from "bullmq";

export interface EnqueueOptions {
  type: string;
  queue: string;
  payload: Record<string, unknown>;
  userId?: number;
  organizationId?: string;
  priority?: number;
  delay?: number;
  scheduledAt?: Date;
}

/**
 * Dual-write: creates a Postgres Job record for audit trail,
 * then enqueues to BullMQ for async processing.
 *
 * If Redis is unavailable, the Postgres record is still created
 * (status PENDING) so a recovery sweep can pick it up later.
 */
export async function enqueue(opts: EnqueueOptions): Promise<string> {
  const job = await prisma.job.create({
    data: {
      type: opts.type,
      queue: opts.queue,
      payload: opts.payload,
      priority: opts.priority ?? 0,
      scheduledAt: opts.scheduledAt ?? null,
      userId: opts.userId ?? null,
      organizationId: opts.organizationId ?? null,
    },
  });

  try {
    const bullOpts: JobsOptions = {
      jobId: job.id,
      priority: opts.priority,
    };

    if (opts.delay) {
      bullOpts.delay = opts.delay;
    } else if (opts.scheduledAt) {
      const ms = opts.scheduledAt.getTime() - Date.now();
      if (ms > 0) bullOpts.delay = ms;
    }

    const queue = getQueue(opts.queue);
    await queue.add(opts.type, { jobId: job.id, ...opts.payload }, bullOpts);
  } catch (err) {
    console.error(`[Queue] Failed to enqueue ${opts.type} to Redis (job ${job.id} saved in DB):`, err);
  }

  return job.id;
}
