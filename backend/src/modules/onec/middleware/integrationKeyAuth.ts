// src/modules/onec/middleware/integrationKeyAuth.ts
// Express middleware that authenticates inbound 1C push requests
// using a Bearer Token (Integration Key) instead of a JWT session.
//
// Supports both legacy plain-text keys (oneCPushApiKey) and new
// SHA-256 hashed keys (oneCPushApiKeyHash).
// On success, req.tenantId is set so downstream handlers are tenant-scoped.

import { Request, Response, NextFunction } from "express";
import { prisma } from "../../../prisma";
import { logger } from "../../../utils/logger";
import { hashApiKey } from "./requireIntegrationToken";

/**
 * Authenticates requests using a per-tenant 1C Push API key.
 *
 * Expected header: `Authorization: Bearer <integration-key>`
 *
 * First tries the new hash-based lookup. If no match, falls back to
 * constant-time comparison against legacy plain-text keys.
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
    // ── Try new hash-based lookup first ──────────────────────────────
    const keyHash = hashApiKey(providedKey);
    const hashMatch = await prisma.tenantIntegrations.findFirst({
      where: { oneCPushApiKeyHash: keyHash },
      select: { tenantId: true, oneCPushIsActive: true },
    });

    if (!hashMatch) {
      res.status(401).json({
        error: {
          code: "INVALID_INTEGRATION_KEY",
          message: "The provided integration key is not valid.",
        },
      });
      return;
    }

    if (!hashMatch.oneCPushIsActive) {
      res.status(401).json({
        error: {
          code: "INTEGRATION_KEY_DISABLED",
          message: "This integration key has been disabled.",
        },
      });
      return;
    }

    req.tenantId = hashMatch.tenantId;
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
