// src/queues/onec-sync.worker.ts
// BullMQ worker that processes 1C OData sync jobs in the background
// and emits progress via Socket.io so the frontend can show live status.

import { Worker, Job } from "bullmq";
import { createRedisConnection } from "./redis";
import { ONEC_SYNC_QUEUE_NAME, type OneCJobData, type OneCJobResult } from "./onec-sync.queue";
import { OneCSyncService } from "../modules/onec/services/1c-sync.service";
import { logger } from "../utils/logger";
import type { Server as IOServer } from "socket.io";

let _worker: Worker<OneCJobData, OneCJobResult> | null = null;
let _io: IOServer | null = null;

/**
 * Emit a Socket.io event to the tenant-specific room.
 */
function emitToTenant(tenantId: string, event: string, payload: unknown): void {
  if (_io) {
    _io.to(`tenant:${tenantId}`).emit(event, payload);
  }
}

/**
 * Starts the BullMQ worker for 1C sync jobs.
 * Must be called once during server bootstrap (after Socket.io is ready).
 */
export function startOneCWorker(io?: IOServer): Worker<OneCJobData, OneCJobResult> {
  if (_worker) return _worker;
  if (io) _io = io;

  _worker = new Worker<OneCJobData, OneCJobResult>(
    ONEC_SYNC_QUEUE_NAME,
    async (job: Job<OneCJobData, OneCJobResult>) => {
      const { tenantId } = job.data;

      logger.info(`[1C-Worker] Processing job ${job.id} for tenant=${tenantId}`);
      emitToTenant(tenantId, "onec:sync:start", { jobId: job.id, tenantId });

      // Build a sync service with tenant-specific 1C credentials
      const svc = await OneCSyncService.forTenant(tenantId);
      const report = await svc.syncAll();

      const result: OneCJobResult = {
        tenantId,
        startedAt: report.startedAt.toISOString(),
        finishedAt: report.finishedAt.toISOString(),
        totalEntities: report.results.length,
        aborted: report.aborted,
        error: report.error ?? undefined,
      };

      emitToTenant(tenantId, "onec:sync:complete", { jobId: job.id, ...result });
      logger.info(`[1C-Worker] Job ${job.id} done — entities=${result.totalEntities} aborted=${result.aborted}`);
      return result;
    },
    {
      connection: createRedisConnection(),
      concurrency: 2,           // max 2 syncs in parallel
      limiter: {
        max: 1,                 // 1 job per tenant per interval
        duration: 30_000,
      },
    },
  );

  _worker.on("failed", (job, err) => {
    const tenantId = job?.data?.tenantId;
    logger.error(`[1C-Worker] Job ${job?.id} failed for tenant=${tenantId ?? "unknown"}: ${err.message}`);
    if (tenantId) {
      emitToTenant(tenantId, "onec:sync:error", {
        jobId: job?.id,
        tenantId,
        error: err.message,
      });
    }
  });

  _worker.on("error", (err) => {
    logger.error("[1C-Worker] Worker error:", err.message);
  });

  logger.info("[1C-Worker] Worker started, listening for 1C sync jobs");
  return _worker;
}

/**
 * Gracefully shut down the worker.
 */
export async function stopOneCWorker(): Promise<void> {
  if (_worker) {
    await _worker.close();
    _worker = null;
    logger.info("[1C-Worker] Worker stopped");
  }
}
