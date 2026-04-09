// src/routes/tenant.routes.ts
import { Router, Request, Response } from "express";
import { SystemSettingsService } from "../services/SystemSettingsService";
import { logger } from "../utils/logger";

const router = Router();

/**
 * GET /api/tenant/settings
 * Public endpoint — returns tenant branding (name, logo, colors).
 * No authentication required so the login page can render correctly.
 */
router.get("/settings", async (_req: Request, res: Response) => {
  try {
    const settings = await SystemSettingsService.getTenantSettings();
    res.json(settings);
  } catch (error) {
    logger.error("Error getting tenant settings:", error);
    res.status(500).json({ message: "Failed to load tenant settings" });
  }
});

export default router;
