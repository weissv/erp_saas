import type { PrismaClient } from "@prisma/client";
import { config } from "../config";
import { getMasterPrisma } from "../lib/masterPrisma";
import { getRequestPrisma, getRequestTenantId } from "../lib/requestContext";
import { getTenantPrisma } from "../lib/tenantPrisma";
import { rootPrisma } from "../prisma";
import { logger } from "../utils/logger";
import { EncryptionService } from "./EncryptionService";

/** Default tenant ID for single-tenant / legacy deployments. */
export const DEFAULT_TENANT_ID = "default";

export interface TenantCredentials {
  tenantId: string;
  telegramBotToken: string | null;
  geminiApiKey: string | null;
  groqApiKey: string | null;
  groqModel: string;
  groqBlitzModel: string;
  groqHeavyModel: string;
  googleDriveApiKey: string | null;
  googleDriveFolderId: string;
  oneCBaseUrl: string;
  oneCUser: string;
  oneCPassword: string;
  oneCTimeoutMs: number;
  oneCCronSchedule: string;
}

const cache = new Map<string, { data: TenantCredentials; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;

function buildCredentials(
  tenantId: string,
  row: {
    telegramBotToken?: string | null;
    geminiApiKey?: string | null;
    groqApiKey?: string | null;
    groqModel?: string | null;
    groqBlitzModel?: string | null;
    groqHeavyModel?: string | null;
    googleDriveApiKey?: string | null;
    googleDriveFolderId?: string | null;
    oneCBaseUrl?: string | null;
    oneCUser?: string | null;
    oneCPassword?: string | null;
    oneCTimeoutMs?: number | null;
    oneCCronSchedule?: string | null;
  } | null,
): TenantCredentials {
  return {
    tenantId,
    telegramBotToken: row?.telegramBotToken ?? process.env.TELEGRAM_BOT_TOKEN?.trim() ?? null,
    geminiApiKey: row?.geminiApiKey ?? process.env.GEMINI_API_KEY?.trim() ?? null,
    groqApiKey: row?.groqApiKey ?? (config.groqApiKey?.trim() || null),
    groqModel: row?.groqModel ?? config.groqModel ?? "qwen/qwen3-32b",
    groqBlitzModel: row?.groqBlitzModel ?? config.groqBlitzModel ?? "llama-3.1-8b-instant",
    groqHeavyModel: row?.groqHeavyModel ?? config.groqHeavyModel ?? "openai/gpt-oss-120b",
    googleDriveApiKey: row?.googleDriveApiKey ?? process.env.GOOGLE_DRIVE_API_KEY?.trim() ?? null,
    googleDriveFolderId: row?.googleDriveFolderId ?? process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() ?? "",
    oneCBaseUrl: row?.oneCBaseUrl ?? config.oneCBaseUrl,
    oneCUser: row?.oneCUser ?? config.oneCUser,
    oneCPassword: row?.oneCPassword ?? config.oneCPassword,
    oneCTimeoutMs: row?.oneCTimeoutMs ?? config.oneCTimeoutMs,
    oneCCronSchedule: row?.oneCCronSchedule ?? config.oneCCronSchedule,
  };
}

async function resolveTenantPrisma(tenantId: string): Promise<PrismaClient> {
  const requestPrisma = getRequestPrisma();
  const requestTenantId = getRequestTenantId();

  if (requestPrisma && requestTenantId === tenantId) {
    return requestPrisma;
  }

  if (tenantId === DEFAULT_TENANT_ID) {
    return rootPrisma;
  }

  const master = getMasterPrisma();
  const tenant = await master.tenant.findUnique({
    where: { id: tenantId },
    select: { dbUrl: true },
  });

  if (!tenant?.dbUrl) {
    throw new Error(`Tenant ${tenantId} not found`);
  }

  return getTenantPrisma(tenantId, tenant.dbUrl);
}

export async function getTenantIntegrations(tenantId: string): Promise<TenantCredentials> {
  const now = Date.now();
  const cached = cache.get(tenantId);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  try {
    const tenantPrisma = await resolveTenantPrisma(tenantId);
    const row = await tenantPrisma.tenantIntegrations.findUnique({
      where: { tenantId },
    });

    const credentials = buildCredentials(tenantId, row);
    cache.set(tenantId, {
      data: credentials,
      expiresAt: now + CACHE_TTL_MS,
    });

    return credentials;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("does not exist") ||
        error.message.includes("UNDEFINED_TABLE") ||
        error.message.includes("not found"))
    ) {
      logger.warn(`[TenantIntegrations] Falling back to .env values for tenant ${tenantId}`);
      return buildCredentials(tenantId, null);
    }

    logger.error("[TenantIntegrations] Error fetching credentials:", error);
    return buildCredentials(tenantId, null);
  }
}

export const getCredentials = getTenantIntegrations;

export function invalidateCache(tenantId: string): void {
  cache.delete(tenantId);
}

export function invalidateAllCache(): void {
  cache.clear();
}

export async function getDecryptedOpenAiKey(tenantId: string): Promise<string | null> {
  try {
    const tenantPrisma = await resolveTenantPrisma(tenantId);
    const row = await tenantPrisma.tenantIntegrations.findUnique({
      where: { tenantId },
      select: {
        openAiKeyEncrypted: true,
        openAiKeyIv: true,
        openAiKeyAuthTag: true,
      },
    });

    if (!row?.openAiKeyEncrypted || !row.openAiKeyIv || !row.openAiKeyAuthTag) {
      return null;
    }

    return EncryptionService.decrypt({
      encrypted: row.openAiKeyEncrypted,
      iv: row.openAiKeyIv,
      authTag: row.openAiKeyAuthTag,
    });
  } catch (error) {
    logger.error(`[TenantIntegrations] Failed to decrypt OpenAI key for tenant ${tenantId}:`, error);
    return null;
  }
}

export const TenantIntegrationsService = {
  getCredentials,
  getTenantIntegrations,
  invalidateCache,
  invalidateAllCache,
  getDecryptedOpenAiKey,
};
