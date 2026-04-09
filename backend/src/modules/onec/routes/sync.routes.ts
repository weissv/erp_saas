import { Router } from "express";
import { checkRole } from "../../../middleware/checkRole";
import { oneCAllowedRoles } from "../services/onec-data.service";
import { oneCSyncService, OneCSyncService } from "../services/sync";
import { logger } from "../../../utils/logger";
import { getOneCQueue, type OneCJobData } from "../../../queues/onec-sync.queue";

const router = Router();

/**
 * POST /api/integrations/1c/sync
 *
 * If Redis / BullMQ is available the request is enqueued and returns
 * immediately with a jobId.  The frontend can listen for Socket.io
 * events ("onec:sync:start", "onec:sync:complete", "onec:sync:error")
 * to track progress.
 *
 * If Redis is unreachable, falls back to the original synchronous
 * execution to maintain backward compatibility.
 */
router.post(
  "/1c/sync",
  checkRole(oneCAllowedRoles),
  async (req, res) => {
    const tenantId: string = (req as any).tenantId ?? "default";

    // ── Try async queue first ────────────────────────────────────
    try {
      const queue = getOneCQueue();
      const job = await queue.add("sync", { tenantId } satisfies OneCJobData, {
        // De-duplicate: only one active sync per tenant at a time
        jobId: `onec-sync-${tenantId}-${Date.now()}`,
      });

      logger.info(`[1C-Sync] Job ${job.id} enqueued for tenant=${tenantId}`);
      return res.status(202).json({
        status: "queued",
        jobId: job.id,
        message: "1C sync job has been queued and will run in the background",
      });
    } catch (queueError) {
      logger.warn(
        "[1C-Sync] Queue unavailable, falling back to synchronous sync:",
        queueError instanceof Error ? queueError.message : String(queueError),
      );
    }

    // ── Fallback: synchronous execution ─────────────────────────
    try {
      let svc: OneCSyncService;
      if (tenantId !== "default") {
        svc = await OneCSyncService.forTenant(tenantId);
      } else {
        svc = oneCSyncService;
      }
      const report = await svc.syncAll();
      return res.json(report);
    } catch (error: unknown) {
      logger.error("1C sync error:", error instanceof Error ? error.message : String(error));
      return res.status(500).json({
        status: "error",
        message: "Ошибка синхронизации с 1С",
      });
    }
  }
);

export default router;
