// src/modules/onec/routes/push-sync.routes.ts
// POST /api/v1/integration/1c/sync
//
// Secure endpoint for receiving data pushed from a 1C Extension.
// Auth: Bearer Token (per-tenant integration key)
// Flow: validate payload → enqueue BullMQ job → return 202 Accepted

import { Router } from "express";
import { integrationKeyAuth } from "../middleware/integrationKeyAuth";
import { tierGuard } from "../middleware/tierGuard";
import { oneCPushPayloadSchema } from "../../../schemas/onec-push.schema";
import { getOneCPushQueue } from "../queue/onec-push.queue";
import { logger } from "../../../utils/logger";

const router = Router();

/**
 * POST /api/v1/integration/1c/sync
 *
 * Receives a JSON payload from a 1C Extension, validates its schema,
 * pushes a processing job to BullMQ, and immediately returns 202 Accepted.
 *
 * Authentication: Bearer Token (Integration Key) — NOT a JWT session.
 * Authorization: Tenant must be on Pro or Enterprise tier.
 */
router.post(
  "/1c/sync",
  integrationKeyAuth,
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

    // ── Enqueue the job (non-blocking) ───────────────────────────────
    try {
      const queue = getOneCPushQueue();
      const job = await queue.add(
        "push-sync",
        {
          tenantId,
          payload,
          receivedAt: new Date().toISOString(),
        },
        {
          // Deduplicate by tenant + timestamp window to avoid double pushes
          jobId: `onec-push-${tenantId}-${Date.now()}`,
        },
      );

      logger.info(
        `[1C-Push] Job ${job.id} enqueued for tenant=${tenantId}, batches=${payload.batches.length}`,
      );

      return res.status(202).json({
        status: "accepted",
        jobId: job.id,
        message: "Data has been accepted and will be processed in the background.",
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
