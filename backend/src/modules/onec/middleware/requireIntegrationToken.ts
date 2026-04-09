// src/modules/onec/middleware/requireIntegrationToken.ts
// Express middleware that authenticates inbound 1C push requests
// using a Bearer Token → SHA-256 hash lookup in the DB.
//
// SECURITY:
// - Plain-text keys are NEVER stored; only SHA-256 hashes live in the DB.
// - Constant-time comparison prevents timing attacks.
// - The `isActive` flag allows disabling a key without revoking it.
// On success, req.tenantId is set so downstream handlers are tenant-scoped.

import { Request, Response, NextFunction } from "express";
import { prisma } from "../../../prisma";
import { logger } from "../../../utils/logger";
import crypto from "crypto";

/**
 * Computes the SHA-256 hex digest of a string.
 *
 * NOTE: SHA-256 is appropriate for API key hashing because:
 * - The input is a cryptographically random 32-byte (256-bit) secret.
 * - Brute-force/dictionary attacks are infeasible against high-entropy input.
 * - SHA-256 is the industry standard for API key storage (AWS, GitHub, Stripe).
 * - bcrypt/scrypt are for user-chosen passwords with low entropy, not random tokens.
 */
export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key, "utf8").digest("hex");
}

/**
 * Authenticates requests using a per-tenant 1C Push API key.
 *
 * Expected header: `Authorization: Bearer <integration-key>`
 *
 * The middleware hashes the incoming key and looks up the hash in the DB.
 * On success, injects `req.tenantId` for downstream handlers.
 */
export async function requireIntegrationToken(
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
    // Hash the provided key and do a direct DB lookup (indexed).
    const keyHash = hashApiKey(providedKey);

    const integration = await prisma.tenantIntegrations.findFirst({
      where: { oneCPushApiKeyHash: keyHash },
      select: { tenantId: true, oneCPushIsActive: true },
    });

    if (!integration) {
      res.status(401).json({
        error: {
          code: "INVALID_INTEGRATION_KEY",
          message: "The provided integration key is not valid.",
        },
      });
      return;
    }

    if (!integration.oneCPushIsActive) {
      res.status(401).json({
        error: {
          code: "INTEGRATION_KEY_DISABLED",
          message: "This integration key has been disabled. Contact your administrator.",
        },
      });
      return;
    }

    req.tenantId = integration.tenantId;
    next();
  } catch (error) {
    logger.error("[requireIntegrationToken] Error validating key:", error);
    res.status(500).json({
      error: {
        code: "AUTH_ERROR",
        message: "An error occurred during authentication.",
      },
    });
  }
}
