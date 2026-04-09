// src/modules/onec/queue/onec-sync.worker.ts
// BullMQ Worker that processes 1C OData sync jobs in the background.
// Emits WebSocket events to the tenant-specific room so the frontend
// can display real-time progress.

import { Worker, Job } from "bullmq";
import { getRedisConnection } from "../../../lib/redis";
import { getIO } from "../../../lib/socketio";
import { ONEC_SYNC_QUEUE_NAME, OneCJobData, OneCJobResult } from "./onec-sync.queue";
import { OneCSyncService } from "../services/1c-sync.service";
import { createOneCClientForTenant } from "../services/onec-client";
import { getTenantIntegrations } from "../../../services/TenantIntegrationsService";
import { prisma } from "../../../prisma";
import { logger } from "../../../utils/logger";

/**
 * Emit a Socket.IO event scoped to the tenant room.
 */
function emitToTenant(tenantId: string, event: string, data: unknown): void {
  const io = getIO();
  if (io) {
    io.to(`tenant:${tenantId}`).emit(event, data);
  }
}

let _worker: Worker<OneCJobData, OneCJobResult> | null = null;

/**
 * Starts the BullMQ worker that processes 1C sync jobs.
 * Call once during application startup.
 */
export function startOneCWorker(): Worker<OneCJobData, OneCJobResult> {
  if (_worker) return _worker;

  _worker = new Worker<OneCJobData, OneCJobResult>(
    ONEC_SYNC_QUEUE_NAME,
    async (job: Job<OneCJobData, OneCJobResult>) => {
      const { tenantId, triggeredBy } = job.data;
      logger.info(
        `[1C-Worker] Processing job ${job.id} for tenant=${tenantId} triggeredBy=${triggeredBy ?? "unknown"}`,
      );

      emitToTenant(tenantId, "onec:sync:start", {
        jobId: job.id,
        tenantId,
        triggeredBy,
        startedAt: new Date().toISOString(),
      });

      try {
        // Build a tenant-specific 1C HTTP client
        const creds = await getTenantIntegrations(tenantId);
        const client = createOneCClientForTenant(creds);
        const service = new OneCSyncService(client, prisma);

        const report = await service.syncAll();

        const result: OneCJobResult = {
          startedAt: report.startedAt.toISOString(),
          finishedAt: report.finishedAt.toISOString(),
          totalStages: report.results.length,
          aborted: report.aborted,
          error: report.error,
        };

        emitToTenant(tenantId, "onec:sync:complete", {
          jobId: job.id,
          ...result,
        });

        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`[1C-Worker] Job ${job.id} failed: ${message}`);

        emitToTenant(tenantId, "onec:sync:error", {
          jobId: job.id,
          error: message,
        });

        throw error;
      }
    },
    {
      connection: getRedisConnection(),
      concurrency: 2, // Process up to 2 sync jobs in parallel
    },
  );

  _worker.on("failed", (job, err) => {
    logger.error(
      `[1C-Worker] Job ${job?.id ?? "?"} failed: ${err.message}`,
    );
  });

  _worker.on("completed", (job) => {
    logger.info(`[1C-Worker] Job ${job.id} completed`);
  });

  logger.info("[1C-Worker] Worker started");
  return _worker;
}

/**
 * Gracefully shut down the worker (for process exit).
 */
export async function stopOneCWorker(): Promise<void> {
  if (_worker) {
    await _worker.close();
    _worker = null;
  }
}
