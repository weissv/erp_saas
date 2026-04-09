import { Router } from "express";
import { checkRole } from "../../../middleware/checkRole";
import { oneCAllowedRoles } from "../services/onec-data.service";
import { oneCSyncService } from "../services/sync";
import { getOneCQueue } from "../queue/onec-sync.queue";
import { logger } from "../../../utils/logger";

const router = Router();

/**
 * POST /api/integrations/1c/sync
 *
 * By default, pushes the sync to a BullMQ background queue so the HTTP
 * response returns immediately. Pass ?mode=sync to run the sync inline
 * (useful for debugging / small datasets).
 */
router.post(
  "/1c/sync",
  checkRole(oneCAllowedRoles),
  async (req, res) => {
    const mode = (req.query.mode as string) ?? "async";
    const tenantId: string = (req as any).tenantId ?? "default";

    // --- Synchronous mode (legacy / debug) ---
    if (mode === "sync") {
      try {
        const report = await oneCSyncService.syncAll();
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
      const job = await queue.add("onec-full-sync", {
        tenantId,
        triggeredBy: (req as any).user?.email ?? "api",
      });

      return res.status(202).json({
        status: "queued",
        jobId: job.id,
        message: "1C sync job enqueued. Listen to WebSocket events for progress.",
      });
    } catch (queueError: unknown) {
      logger.error(
        "Failed to enqueue 1C sync job:",
        queueError instanceof Error ? queueError.message : String(queueError),
      );

      // Fallback to synchronous execution if Redis/BullMQ is unavailable
      try {
        const report = await oneCSyncService.syncAll();
        return res.json({ ...report, _fallback: true });
      } catch (syncError: unknown) {
        logger.error("1C sync error (fallback):", syncError instanceof Error ? syncError.message : String(syncError));
        return res.status(500).json({
          status: "error",
          message: "Ошибка синхронизации с 1С",
        });
      }
    }
  }
);

export default router;
