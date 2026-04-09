// src/modules/onec/routes/onec-integration-settings.routes.ts
// Authenticated routes for managing the 1C Push Integration settings.
// These are called from the frontend Self-Serve UI.

import { Router } from "express";
import crypto from "crypto";
import { checkRole } from "../../../middleware/checkRole";
import { prisma } from "../../../prisma";
import { getMasterPrisma } from "../../../lib/masterPrisma";
import { PRICING_TIERS } from "../../saas/constants";
import { logger } from "../../../utils/logger";
import { invalidateCache } from "../../../services/TenantIntegrationsService";

const router = Router();

/** Roles allowed to manage 1C integration settings */
const ALLOWED_ROLES = ["DEVELOPER", "DIRECTOR", "DEPUTY", "ADMIN"];

/**
 * GET /api/integrations/1c/settings
 *
 * Returns the current 1C push integration status for the tenant,
 * including whether an API key is configured (but NOT the key itself).
 * Also returns the tenant's subscription tier for frontend gating.
 */
router.get(
  "/1c/settings",
  checkRole(ALLOWED_ROLES),
  async (req, res) => {
    const tenantId = req.tenantId ?? "default";

    try {
      const integration = await prisma.tenantIntegrations.findUnique({
        where: { tenantId },
        select: { oneCPushApiKey: true },
      });

      // Resolve tier from master DB
      let tier: string = PRICING_TIERS.PRO; // default for legacy
      try {
        const master = getMasterPrisma();
        const result = await master.$queryRawUnsafe<{ tier: string }[]>(
          `SELECT "tier" FROM "tenants" WHERE "id" = $1 LIMIT 1`,
          tenantId,
        );
        if (result?.[0]?.tier) {
          tier = result[0].tier.toLowerCase();
        }
      } catch {
        // Master DB unavailable — fall back to pro (legacy mode)
      }

      return res.json({
        hasApiKey: !!integration?.oneCPushApiKey,
        tier,
      });
    } catch (error) {
      logger.error("[1C-Settings] Error fetching settings:", error);
      return res.status(500).json({
        error: { code: "FETCH_ERROR", message: "Could not fetch integration settings." },
      });
    }
  },
);

/**
 * POST /api/integrations/1c/settings/generate-key
 *
 * Generates a new API key for the 1C Push Integration.
 * The key is returned ONCE in the response and stored in the DB.
 * Subsequent calls will overwrite the previous key.
 */
router.post(
  "/1c/settings/generate-key",
  checkRole(ALLOWED_ROLES),
  async (req, res) => {
    const tenantId = req.tenantId ?? "default";

    // Check tier — only Pro/Enterprise can generate keys
    try {
      const master = getMasterPrisma();
      const result = await master.$queryRawUnsafe<{ tier: string }[]>(
        `SELECT "tier" FROM "tenants" WHERE "id" = $1 LIMIT 1`,
        tenantId,
      );
      const tier = result?.[0]?.tier?.toLowerCase();
      if (tier === PRICING_TIERS.STARTER) {
        return res.status(403).json({
          error: {
            code: "TIER_UPGRADE_REQUIRED",
            message: "Upgrade to Pro to use the 1C Push API.",
          },
        });
      }
    } catch {
      // Master DB unavailable — allow (legacy mode)
    }

    try {
      // Generate a cryptographically secure API key
      const apiKey = `1c_${crypto.randomBytes(32).toString("hex")}`;

      await prisma.tenantIntegrations.upsert({
        where: { tenantId },
        update: { oneCPushApiKey: apiKey },
        create: { tenantId, oneCPushApiKey: apiKey },
      });

      // Invalidate the cached credentials for this tenant
      invalidateCache(tenantId);

      logger.info(`[1C-Settings] API key generated for tenant=${tenantId}`);

      return res.status(201).json({
        apiKey, // Shown ONCE to the user
        message: "API key generated successfully. Store it securely — it will not be shown again.",
      });
    } catch (error) {
      logger.error("[1C-Settings] Error generating key:", error);
      return res.status(500).json({
        error: { code: "KEY_GEN_ERROR", message: "Could not generate API key." },
      });
    }
  },
);

/**
 * DELETE /api/integrations/1c/settings/revoke-key
 *
 * Revokes the current API key, immediately disabling 1C push access.
 */
router.delete(
  "/1c/settings/revoke-key",
  checkRole(ALLOWED_ROLES),
  async (req, res) => {
    const tenantId = req.tenantId ?? "default";

    try {
      await prisma.tenantIntegrations.update({
        where: { tenantId },
        data: { oneCPushApiKey: null },
      });

      invalidateCache(tenantId);

      logger.info(`[1C-Settings] API key revoked for tenant=${tenantId}`);

      return res.json({
        message: "API key revoked successfully.",
      });
    } catch (error) {
      logger.error("[1C-Settings] Error revoking key:", error);
      return res.status(500).json({
        error: { code: "REVOKE_ERROR", message: "Could not revoke API key." },
      });
    }
  },
);

export default router;
