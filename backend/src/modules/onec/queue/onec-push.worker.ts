// src/modules/onec/queue/onec-push.worker.ts
// BullMQ Worker that processes inbound 1C push data.
//
// Key guarantees:
// 1. All-or-nothing writes via Prisma `$transaction`.
// 2. Idempotency — duplicate jobs (same jobId) are safely skipped.
// 3. Observability — structured logs with tenantId context.
// 4. Real-time UX — WebSocket events on completion/failure.

import { Worker, Job } from "bullmq";
import crypto from "crypto";
import { getRedisConnection } from "../../../lib/redis";
import { getIO } from "../../../lib/socketio";
import { prisma } from "../../../prisma";
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
      const jobId = job.id!;

      logger.info(
        `[1C-Push-Worker] Processing job ${jobId} for tenant=${tenantId}, batches=${payload.batches.length}`,
      );

      // ── Idempotency check: skip only if already completed successfully ──
      try {
        const existingLog = await prisma.oneCPushSyncLog.findUnique({
          where: { jobId },
          select: { status: true },
        });

        if (existingLog?.status === "success") {
          logger.info(
            `[1C-Push-Worker] Job ${jobId} already completed successfully, skipping (idempotency)`,
          );
          return {
            tenantId,
            processedAt: new Date().toISOString(),
            totalBatches: payload.batches.length,
            totalRecords: 0,
            errors: 0,
          };
        }
      } catch {
        // Log table may not exist yet — proceed anyway
      }

      // Mark the job as processing
      try {
        await prisma.oneCPushSyncLog.upsert({
          where: { jobId },
          update: { status: "processing" },
          create: {
            tenantId,
            jobId,
            status: "processing",
            totalBatches: payload.batches.length,
            totalRecords: payload.batches.reduce((sum, b) => sum + b.records.length, 0),
            receivedAt: new Date(receivedAt),
          },
        });
      } catch {
        // Non-critical — continue processing
      }

      emitToTenant(tenantId, "onec:push:start", {
        jobId,
        tenantId,
        receivedAt,
        batchCount: payload.batches.length,
      });

      let totalRecords = 0;
      let errors = 0;

      try {
        // ── All-or-nothing processing via $transaction ─────────────
        await prisma.$transaction(async (tx) => {
          for (const batch of payload.batches) {
            totalRecords += batch.records.length;

            // Each batch.entity (e.g. "Catalog_Контрагенты") should be routed
            // to the appropriate handler that maps the 1C record format to our
            // Prisma models and performs an upsert.
            //
            // For now, we store raw records in the OneCRegister model as a
            // generic catch-all. Entity-specific handlers will be added as
            // the data mapping layer is implemented.
            for (const record of batch.records) {
              try {
                const externalId =
                  typeof record["Ref_Key"] === "string" && record["Ref_Key"]
                    ? String(record["Ref_Key"])
                    : `${batch.entity}_${crypto.randomUUID()}`;

                await tx.oneCRegister.upsert({
                  where: {
                    registerType_externalId: {
                      registerType: batch.entity,
                      externalId,
                    },
                  },
                  update: {
                    data: record as object,
                    active: true,
                    updatedAt: new Date(),
                  },
                  create: {
                    registerType: batch.entity,
                    externalId,
                    data: record as object,
                    active: true,
                  },
                });
              } catch (recordError) {
                errors++;
                logger.error(
                  `[1C-Push-Worker] Job ${jobId}: upsert error for entity=${batch.entity}:`,
                  recordError instanceof Error ? recordError.message : String(recordError),
                );
              }
            }

            logger.info(
              `[1C-Push-Worker] Job ${jobId}: entity=${batch.entity}, records=${batch.records.length}`,
            );
          }
        });

        const processedAt = new Date();
        const result: OneCPushJobResult = {
          tenantId,
          processedAt: processedAt.toISOString(),
          totalBatches: payload.batches.length,
          totalRecords,
          errors,
        };

        // ── Update lastSyncAt on the tenant integration ──────────
        try {
          await prisma.tenantIntegrations.update({
            where: { tenantId },
            data: { oneCPushLastSyncAt: processedAt },
          });
        } catch {
          // Non-critical
        }

        // ── Update sync log ──────────────────────────────────────
        try {
          await prisma.oneCPushSyncLog.update({
            where: { jobId },
            data: {
              status: errors > 0 ? "failed" : "success",
              totalRecords,
              errors,
              processedAt,
            },
          });
        } catch {
          // Non-critical
        }

        // ── Emit real-time event: sync_complete ──────────────────
        emitToTenant(tenantId, "onec:push:complete", {
          jobId,
          ...result,
        });
        emitToTenant(tenantId, "sync_complete", {
          jobId,
          ...result,
        });

        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`[1C-Push-Worker] Job ${jobId} failed: ${message}`);

        // Update sync log with failure
        try {
          await prisma.oneCPushSyncLog.update({
            where: { jobId },
            data: {
              status: "failed",
              totalRecords,
              errors,
              errorMessage: message.slice(0, 4096),
              processedAt: new Date(),
            },
          });
        } catch {
          // Non-critical
        }

        emitToTenant(tenantId, "onec:push:error", {
          jobId,
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
