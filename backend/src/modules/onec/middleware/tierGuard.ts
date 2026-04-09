// src/modules/onec/middleware/tierGuard.ts
// Express middleware that enforces subscription tier requirements
// for the 1C Push Integration API.
//
// Starter → 403 Forbidden (upgrade required)
// Pro / Enterprise → allowed

import { Request, Response, NextFunction } from "express";
import { getMasterPrisma } from "../../../lib/masterPrisma";
import { PRICING_TIERS } from "../../saas/constants";
import { logger } from "../../../utils/logger";

/**
 * Middleware that rejects requests from tenants whose subscription tier
 * is below the required minimum (Starter → 403).
 *
 * Falls back to allowing access when the tier cannot be resolved
 * (e.g. single-tenant / legacy deployments without a master DB).
 */
export async function tierGuard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const tenantId = req.tenantId;

  if (!tenantId || tenantId === "default") {
    // Single-tenant / legacy mode — no tier enforcement
    next();
    return;
  }

  await resolveTierAndGuard(tenantId, res, next);
}

async function resolveTierAndGuard(
  tenantId: string,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const master = getMasterPrisma();

    // The master schema uses `tenants` as the table name (@@map("tenants")).
    // The `tier` column is set during tenant provisioning via raw SQL.
    const result = await master.$queryRawUnsafe<{ tier: string }[]>(
      `SELECT "tier" FROM "tenants" WHERE "id" = $1 LIMIT 1`,
      tenantId,
    );

    const tier = result?.[0]?.tier?.toLowerCase();

    if (!tier) {
      // Tier not found — could be a legacy tenant; allow access
      next();
      return;
    }

    if (tier === PRICING_TIERS.STARTER) {
      res.status(403).json({
        error: {
          code: "TIER_UPGRADE_REQUIRED",
          message:
            "Your current plan (Starter) does not include the 1C Push API. Please upgrade to Pro or Enterprise.",
          requiredTier: PRICING_TIERS.PRO,
        },
      });
      return;
    }

    // Pro or Enterprise — allow
    next();
  } catch (error) {
    // If master DB is unavailable, allow the request to proceed
    // (single-tenant fallback).
    logger.warn("[tierGuard] Could not resolve tier, allowing request:", error);
    next();
  }
}
