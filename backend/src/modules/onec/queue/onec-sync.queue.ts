// src/modules/onec/queue/onec-sync.queue.ts
// BullMQ queue definition for 1C OData sync jobs.

import { Queue } from "bullmq";
import { getRedisConnection } from "../../../lib/redis";

export const ONEC_SYNC_QUEUE_NAME = "onec-sync";

export interface OneCJobData {
  tenantId: string;
  triggeredBy?: string; // user email or "cron"
}

export interface OneCJobResult {
  startedAt: string;
  finishedAt: string;
  totalStages: number;
  aborted: boolean;
  error?: string;
}

let _queue: Queue<OneCJobData, OneCJobResult> | null = null;

/**
 * Returns the singleton BullMQ Queue for 1C sync jobs.
 * Lazily created on first access so the Redis connection is
 * only established when actually needed.
 */
export function getOneCQueue(): Queue<OneCJobData, OneCJobResult> {
  if (!_queue) {
    _queue = new Queue<OneCJobData, OneCJobResult>(ONEC_SYNC_QUEUE_NAME, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: "exponential", delay: 30_000 },
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 100 },
      },
    });
  }
  return _queue;
}
