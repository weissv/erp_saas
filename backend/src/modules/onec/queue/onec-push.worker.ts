// src/modules/onec/queue/onec-push.worker.ts
// BullMQ Worker that processes inbound 1C push data.
// This is the worker skeleton — business logic will be added as the
// data mapping layer is implemented for each 1C entity type.

import { Worker, Job } from "bullmq";
import { getRedisConnection } from "../../../lib/redis";
import { getIO } from "../../../lib/socketio";
import {
  ONEC_PUSH_QUEUE_NAME,
  type OneCPushJobData,
  type OneCPushJobResult,
} from "./onec-push.queue";
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

let _worker: Worker<OneCPushJobData, OneCPushJobResult> | null = null;

/**
 * Starts the BullMQ worker that processes inbound 1C push data.
 * Call once during application startup.
 */
export function startOneCPushWorker(): Worker<OneCPushJobData, OneCPushJobResult> {
  if (_worker) return _worker;

  _worker = new Worker<OneCPushJobData, OneCPushJobResult>(
    ONEC_PUSH_QUEUE_NAME,
    async (job: Job<OneCPushJobData, OneCPushJobResult>) => {
      const { tenantId, payload, receivedAt } = job.data;

      logger.info(
        `[1C-Push-Worker] Processing job ${job.id} for tenant=${tenantId}, batches=${payload.batches.length}`,
      );

      emitToTenant(tenantId, "onec:push:start", {
        jobId: job.id,
        tenantId,
        receivedAt,
        batchCount: payload.batches.length,
      });

      let totalRecords = 0;
      let errors = 0;

      try {
        for (const batch of payload.batches) {
          totalRecords += batch.records.length;

          // ── TODO: Implement entity-specific upsert logic ──────────────
          // Each batch.entity (e.g. "Catalog_Контрагенты") should be routed
          // to the appropriate handler that maps the 1C record format to our
          // Prisma models and performs an upsert.
          //
          // Example:
          //   switch (batch.entity) {
          //     case "Catalog_Контрагенты":
          //       await upsertContractors(tenantId, batch.records);
          //       break;
          //     case "Document_ПоступлениеНаРасчетныйСчет":
          //       await upsertBankReceipts(tenantId, batch.records);
          //       break;
          //     default:
          //       logger.warn(`[1C-Push-Worker] Unknown entity: ${batch.entity}`);
          //       errors += batch.records.length;
          //   }
          // ──────────────────────────────────────────────────────────────

          logger.info(
            `[1C-Push-Worker] Job ${job.id}: entity=${batch.entity}, records=${batch.records.length} (processing skeleton)`,
          );
        }

        const result: OneCPushJobResult = {
          tenantId,
          processedAt: new Date().toISOString(),
          totalBatches: payload.batches.length,
          totalRecords,
          errors,
        };

        emitToTenant(tenantId, "onec:push:complete", {
          jobId: job.id,
          ...result,
        });

        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`[1C-Push-Worker] Job ${job.id} failed: ${message}`);

        emitToTenant(tenantId, "onec:push:error", {
          jobId: job.id,
          error: message,
        });

        throw error;
      }
    },
    {
      connection: getRedisConnection(),
      concurrency: 3,
    },
  );

  _worker.on("failed", (job, err) => {
    logger.error(
      `[1C-Push-Worker] Job ${job?.id ?? "?"} failed: ${err.message}`,
    );
  });

  _worker.on("completed", (job) => {
    logger.info(`[1C-Push-Worker] Job ${job.id} completed`);
  });

  logger.info("[1C-Push-Worker] Worker started");
  return _worker;
}

/**
 * Gracefully shut down the push worker (for process exit).
 */
export async function stopOneCPushWorker(): Promise<void> {
  if (_worker) {
    await _worker.close();
    _worker = null;
  }
}
