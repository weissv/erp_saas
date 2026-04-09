import { Router } from "express";
import { checkRole } from "../../../middleware/checkRole";
import { oneCAllowedRoles } from "../services/onec-data.service";
import { oneCSyncService, OneCSyncService } from "../services/sync";
import { getOneCQueue } from "../queue/onec-sync.queue";
import { logger } from "../../../utils/logger";

const router = Router();

/**
 * POST /api/integrations/1c/sync
 *
 * By default, pushes the sync to a BullMQ background queue so the HTTP
 * response returns immediately.  Pass ?mode=sync to run the sync inline
 * (useful for debugging / small datasets).
 *
 * If Redis is unreachable, falls back to synchronous execution to maintain
 * backward compatibility.
 */
router.post(
  "/1c/sync",
  checkRole(oneCAllowedRoles),
  async (req, res) => {
    const mode = (req.query.mode as string) ?? "async";
    const tenantId: string = req.tenantId ?? "default";

    // --- Synchronous mode (legacy / debug) ---
    if (mode === "sync") {
      try {
        const svc = tenantId !== "default"
          ? await OneCSyncService.forTenant(tenantId)
          : oneCSyncService;
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

    // --- Asynchronous mode (BullMQ) ---
    try {
      const queue = getOneCQueue();
      const job = await queue.add("sync", {
        tenantId,
        triggeredBy: req.user?.role ?? "api",
      }, {
        jobId: `onec-sync-${tenantId}`,
      });

      logger.info(`[1C-Sync] Job ${job.id} enqueued for tenant=${tenantId}`);
      return res.status(202).json({
        status: "queued",
        jobId: job.id,
        message: "1C sync job has been queued and will run in the background",
      });
    } catch (queueError: unknown) {
      logger.warn(
        "[1C-Sync] Queue unavailable, falling back to synchronous sync:",
        queueError instanceof Error ? queueError.message : String(queueError),
      );
    }

    // --- Fallback: synchronous execution ---
    try {
      const svc = tenantId !== "default"
        ? await OneCSyncService.forTenant(tenantId)
        : oneCSyncService;
      const report = await svc.syncAll();
      return res.json({ ...report, _fallback: true });
    } catch (error: unknown) {
      logger.error("1C sync error (fallback):", error instanceof Error ? error.message : String(error));
      return res.status(500).json({
        status: "error",
        message: "Ошибка синхронизации с 1С",
      });
    }
  },
);

export default router;
