// src/modules/onec/queue/onec-push.queue.ts
// BullMQ queue definition for inbound 1C push data processing.

import { Queue } from "bullmq";
import { getRedisConnection } from "../../../lib/redis";
import type { OneCPushPayload } from "../../../schemas/onec-push.schema";

export const ONEC_PUSH_QUEUE_NAME = "onec-push";

export interface OneCPushJobData {
  tenantId: string;
  payload: OneCPushPayload;
  receivedAt: string; // ISO timestamp
}

export interface OneCPushJobResult {
  tenantId: string;
  processedAt: string;
  totalBatches: number;
  totalRecords: number;
  errors: number;
}

let _queue: Queue<OneCPushJobData, OneCPushJobResult> | null = null;

/**
 * Returns the singleton BullMQ Queue for inbound 1C push jobs.
 * Lazily created on first access.
 */
export function getOneCPushQueue(): Queue<OneCPushJobData, OneCPushJobResult> {
  if (!_queue) {
    _queue = new Queue<OneCPushJobData, OneCPushJobResult>(ONEC_PUSH_QUEUE_NAME, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 10_000 },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 500 },
      },
    });
  }
  return _queue;
}
