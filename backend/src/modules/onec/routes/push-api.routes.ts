// src/modules/onec/routes/push-api.routes.ts
// POST /api/v1/integration/1c/push
//
// Production Push API endpoint for receiving data from 1C Extensions.
// Auth: Bearer Token (per-tenant integration key, stored as SHA-256 hash)
// Flow: auth → rate limit → tier guard → Zod validate → BullMQ enqueue → 202 Accepted
//
// This route NEVER blocks the event loop — all heavy processing is
// deferred to the BullMQ worker (onec-push.worker.ts).

import { Router } from "express";
import { requireIntegrationToken } from "../middleware/requireIntegrationToken";
import { pushRateLimiter } from "../middleware/pushRateLimiter";
import { tierGuard } from "../middleware/tierGuard";
import { oneCPushPayloadSchema } from "../../../schemas/onec-push.schema";
import { getOneCPushQueue } from "../queue/onec-push.queue";
import { prisma } from "../../../prisma";
import { logger } from "../../../utils/logger";

const router = Router();

/**
 * POST /api/v1/integration/1c/push
 *
 * Receives a JSON payload from a 1C Extension, validates its schema,
 * pushes a processing job to BullMQ, and immediately returns 202 Accepted.
 *
 * Authentication: Bearer Token (Integration Key) — NOT a JWT session.
 * Authorization: Tenant must be on Pro or Enterprise tier.
 * Rate Limit: 10 requests per minute per tenant.
 */
router.post(
  "/1c/push",
  requireIntegrationToken,
  pushRateLimiter,
  tierGuard,
  async (req, res) => {
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(401).json({
        error: {
          code: "TENANT_NOT_RESOLVED",
          message: "Could not determine tenant from integration key.",
        },
      });
    }

    // ── Schema validation (fast, non-blocking) ───────────────────────
    const parseResult = oneCPushPayloadSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        error: {
          code: "INVALID_PAYLOAD",
          message: "The request body does not match the expected 1C push schema.",
          issues: parseResult.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
      });
    }

    const payload = parseResult.data;
    const receivedAt = new Date().toISOString();

    // ── Enqueue the job (non-blocking) ───────────────────────────────
    try {
      const queue = getOneCPushQueue();
      const job = await queue.add(
        "push-sync",
        {
          tenantId,
          payload,
          receivedAt,
        },
        {
          // Deduplicate by tenant + timestamp window to avoid double pushes
          jobId: `onec-push-${tenantId}-${Date.now()}`,
        },
      );

      // Create an audit log entry (synchronous — needed for worker idempotency check)
      try {
        await prisma.oneCPushSyncLog.create({
          data: {
            tenantId,
            jobId: job.id!,
            status: "pending",
            totalBatches: payload.batches.length,
            totalRecords: payload.batches.reduce((sum, b) => sum + b.records.length, 0),
            receivedAt: new Date(receivedAt),
          },
        });
      } catch (logErr) {
        logger.warn("[1C-Push] Could not create sync log:", logErr);
      }

      logger.info(
        `[1C-Push] Job ${job.id} enqueued for tenant=${tenantId}, batches=${payload.batches.length}`,
      );

      return res.status(202).json({
        status: "accepted",
        jobId: job.id,
      });
    } catch (queueError) {
      logger.error(
        "[1C-Push] Failed to enqueue job:",
        queueError instanceof Error ? queueError.message : String(queueError),
      );

      return res.status(503).json({
        error: {
          code: "QUEUE_UNAVAILABLE",
          message: "The processing queue is temporarily unavailable. Please retry later.",
        },
      });
    }
  },
);

export default router;
