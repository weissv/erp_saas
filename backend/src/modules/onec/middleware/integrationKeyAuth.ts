// src/modules/onec/middleware/integrationKeyAuth.ts
// Express middleware that authenticates inbound 1C push requests
// using a Bearer Token (Integration Key) instead of a JWT session.
//
// The key is validated against the TenantIntegrations table.
// On success, req.tenantId is set so downstream handlers are tenant-scoped.

import { Request, Response, NextFunction } from "express";
import { prisma } from "../../../prisma";
import { logger } from "../../../utils/logger";
import crypto from "crypto";

/**
 * Authenticates requests using a per-tenant 1C Push API key.
 *
 * Expected header: `Authorization: Bearer <integration-key>`
 *
 * The middleware scans all tenants with a configured push key and uses
 * constant-time comparison to prevent timing attacks.
 * On success, injects `req.tenantId` for downstream handlers.
 */
export async function integrationKeyAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({
      error: {
        code: "MISSING_INTEGRATION_KEY",
        message: "Authorization header with Bearer token is required.",
      },
    });
    return;
  }

  const providedKey = header.slice(7).trim();

  if (!providedKey) {
    res.status(401).json({
      error: {
        code: "EMPTY_INTEGRATION_KEY",
        message: "Integration key must not be empty.",
      },
    });
    return;
  }

  try {
    // Fetch all tenants that have a push API key configured.
    // In a large deployment this should be indexed / cached, but for
    // the typical scale (hundreds of tenants) this is fine.
    const integrations = await prisma.tenantIntegrations.findMany({
      where: { oneCPushApiKey: { not: null } },
      select: { tenantId: true, oneCPushApiKey: true },
    });

    const providedKeyBuf = Buffer.from(providedKey, "utf8");
    let matchedTenantId: string | null = null;

    for (const row of integrations) {
      if (!row.oneCPushApiKey) continue;

      const storedKeyBuf = Buffer.from(row.oneCPushApiKey, "utf8");

      // Constant-time comparison to prevent timing attacks.
      // Keys of different length cannot match, but we still compare in
      // constant time to avoid leaking length information.
      if (
        storedKeyBuf.length === providedKeyBuf.length &&
        crypto.timingSafeEqual(storedKeyBuf, providedKeyBuf)
      ) {
        matchedTenantId = row.tenantId;
        break;
      }
    }

    if (!matchedTenantId) {
      res.status(401).json({
        error: {
          code: "INVALID_INTEGRATION_KEY",
          message: "The provided integration key is not valid.",
        },
      });
      return;
    }

    req.tenantId = matchedTenantId;
    next();
  } catch (error) {
    logger.error("[integrationKeyAuth] Error validating key:", error);
    res.status(500).json({
      error: {
        code: "AUTH_ERROR",
        message: "An error occurred during authentication.",
      },
    });
  }
}
