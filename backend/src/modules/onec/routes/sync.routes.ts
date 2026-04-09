import { Router } from "express";
import { checkRole } from "../../../middleware/checkRole";
import { oneCAllowedRoles } from "../services/onec-data.service";
import { oneCSyncService } from "../services/sync";
import { logger } from "../../../utils/logger";

const router = Router();

// POST /api/integrations/1c/sync
router.post(
  "/1c/sync",
  checkRole(oneCAllowedRoles),
  async (_req, res) => {
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
);

export default router;
