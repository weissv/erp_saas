// src/queues/onec-sync.queue.ts
// BullMQ queue definition for 1C OData synchronization jobs.

import { Queue } from "bullmq";
import { createRedisConnection } from "./redis";

export const ONEC_SYNC_QUEUE_NAME = "onec-sync";

export interface OneCJobData {
  tenantId: string;
}

export interface OneCJobResult {
  tenantId: string;
  startedAt: string;
  finishedAt: string;
  totalEntities: number;
  aborted: boolean;
  error?: string;
}

let _queue: Queue<OneCJobData, OneCJobResult> | null = null;

/**
 * Returns the singleton BullMQ Queue for 1C sync.
 * Lazily created on first access so the app doesn't crash if Redis
 * is unavailable at import time.
 */
export function getOneCQueue(): Queue<OneCJobData, OneCJobResult> {
  if (!_queue) {
    _queue = new Queue<OneCJobData, OneCJobResult>(ONEC_SYNC_QUEUE_NAME, {
      connection: createRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 100 },
      },
    });
  }
  return _queue;
}
