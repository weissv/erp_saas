// src/routes/openai-integration.routes.ts
// BYOK OpenAI key management endpoints.
// POST   — store an encrypted key
// GET    — check if configured (never returns the real key)
// DELETE — revoke the key

import { Router, Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { checkRole } from "../middleware/checkRole";
import { EncryptionService } from "../services/EncryptionService";
import { invalidateCache } from "../services/TenantIntegrationsService";
import { logger } from "../utils/logger";

const router = Router();

// Only ADMIN-level roles can manage integrations
const adminGuard = checkRole(["DIRECTOR", "DEPUTY", "ADMIN"]);

// ── GET /api/v1/tenant/integrations/openai ──────────────────────────────────
// Returns { isConfigured, maskedKey? } — NEVER the real key.
router.get(
  "/",
  adminGuard,
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const prisma = req.prisma!;

    const row = await prisma.tenantIntegrations.findUnique({
      where: { tenantId },
      select: {
        openAiKeyEncrypted: true,
        openAiKeyHint: true,
      },
    });

    if (!row?.openAiKeyEncrypted) {
      return res.json({ isConfigured: false, maskedKey: null });
    }

    return res.json({
      isConfigured: true,
      maskedKey: row.openAiKeyHint ?? "sk-...****",
    });
  }),
);

// ── POST /api/v1/tenant/integrations/openai ─────────────────────────────────
// Expects { apiKey: "sk-..." }. Encrypts and stores it.
router.post(
  "/",
  adminGuard,
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const prisma = req.prisma!;
    const { apiKey } = req.body as { apiKey?: string };

    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length < 10) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "A valid OpenAI API key is required.",
        },
      });
    }

    const trimmedKey = apiKey.trim();

    // Encrypt the key
    const { encrypted, iv, authTag } = EncryptionService.encrypt(trimmedKey);
    const maskedKey = EncryptionService.maskApiKey(trimmedKey);

    // Upsert TenantIntegrations row
    await prisma.tenantIntegrations.upsert({
      where: { tenantId },
      update: {
        openAiKeyEncrypted: encrypted,
        openAiKeyIv: iv,
        openAiKeyAuthTag: authTag,
        openAiKeyHint: maskedKey,
      },
      create: {
        tenantId,
        openAiKeyEncrypted: encrypted,
        openAiKeyIv: iv,
        openAiKeyAuthTag: authTag,
        openAiKeyHint: maskedKey,
      },
    });

    // Bust the credentials cache
    invalidateCache(tenantId);

    logger.info(`[OpenAI BYOK] Key configured for tenant ${tenantId}`);

    return res.json({
      success: true,
      isConfigured: true,
      maskedKey,
    });
  }),
);

// ── DELETE /api/v1/tenant/integrations/openai ───────────────────────────────
// Removes the stored key entirely.
router.delete(
  "/",
  adminGuard,
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const prisma = req.prisma!;

    // Clear only the OpenAI-related columns (keep the row for other integrations)
    const existing = await prisma.tenantIntegrations.findUnique({
      where: { tenantId },
    });

    if (existing) {
      await prisma.tenantIntegrations.update({
        where: { tenantId },
        data: {
          openAiKeyEncrypted: null,
          openAiKeyIv: null,
          openAiKeyAuthTag: null,
          openAiKeyHint: null,
        },
      });
    }

    invalidateCache(tenantId);

    logger.info(`[OpenAI BYOK] Key revoked for tenant ${tenantId}`);

    return res.json({ success: true, isConfigured: false });
  }),
);

export default router;
