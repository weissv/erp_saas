// src/services/TenantIntegrationsService.ts
// Runtime credential lookup per tenant.
// Falls back to process.env when no DB row exists (backward-compat).

import { TenantIntegrations } from "@prisma/client";
import { prisma } from "../prisma";
import { config } from "../config";

/**
 * Shape returned to callers — every field is guaranteed present
 * (filled from the DB row or from env-level defaults).
 */
export interface TenantCredentials {
  tenantId: string;

  // Telegram
  telegramBotToken: string | null;

  // 1C OData
  oneCBaseUrl: string;
  oneCUser: string;
  oneCPassword: string;
  oneCTimeoutMs: number;
  oneCCronSchedule: string;

  // AI — Gemini (embeddings)
  geminiApiKey: string | null;

  // AI — Groq (chat / grading)
  groqApiKey: string | null;

  // Google Drive (optional)
  googleDriveApiKey: string | null;
  googleDriveFolderId: string | null;
}

/** Simple in-memory cache with TTL to avoid querying on every request. */
const cache = new Map<string, { data: TenantCredentials; expiresAt: number }>();
const CACHE_TTL_MS = 60_000; // 1 minute

function envFallbackCredentials(tenantId: string): TenantCredentials {
  return {
    tenantId,
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN?.trim() || null,
    oneCBaseUrl: config.oneCBaseUrl,
    oneCUser: config.oneCUser,
    oneCPassword: config.oneCPassword,
    oneCTimeoutMs: config.oneCTimeoutMs,
    oneCCronSchedule: config.oneCCronSchedule,
    geminiApiKey: process.env.GEMINI_API_KEY?.trim() || null,
    groqApiKey: config.groqApiKey || null,
    googleDriveApiKey: process.env.GOOGLE_DRIVE_API_KEY?.trim() || null,
    googleDriveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() || null,
  };
}

function rowToCredentials(row: TenantIntegrations): TenantCredentials {
  const fallback = envFallbackCredentials(row.tenantId);

  return {
    tenantId: row.tenantId,
    telegramBotToken: row.telegramBotToken || fallback.telegramBotToken,
    oneCBaseUrl: row.oneCBaseUrl || fallback.oneCBaseUrl,
    oneCUser: row.oneCUser || fallback.oneCUser,
    oneCPassword: row.oneCPassword || fallback.oneCPassword,
    oneCTimeoutMs: row.oneCTimeoutMs ?? fallback.oneCTimeoutMs,
    oneCCronSchedule: row.oneCCronSchedule || fallback.oneCCronSchedule,
    geminiApiKey: row.geminiApiKey || fallback.geminiApiKey,
    groqApiKey: row.groqApiKey || fallback.groqApiKey,
    googleDriveApiKey: row.googleDriveApiKey || fallback.googleDriveApiKey,
    googleDriveFolderId: row.googleDriveFolderId || fallback.googleDriveFolderId,
  };
}

/**
 * Fetches integration credentials for a given tenantId.
 * Results are cached for CACHE_TTL_MS.
 */
export async function getCredentials(tenantId: string): Promise<TenantCredentials> {
  const now = Date.now();
  const cached = cache.get(tenantId);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  try {
    const row = await prisma.tenantIntegrations.findUnique({
      where: { tenantId },
    });

    const credentials = row ? rowToCredentials(row) : envFallbackCredentials(tenantId);
    cache.set(tenantId, { data: credentials, expiresAt: now + CACHE_TTL_MS });
    return credentials;
  } catch {
    // If the table doesn't exist yet (migration not applied), fall back gracefully.
    return envFallbackCredentials(tenantId);
  }
}

/**
 * Invalidates the cache for a specific tenant (e.g. after updating credentials).
 */
export function invalidateCache(tenantId: string): void {
  cache.delete(tenantId);
}

/**
 * Invalidates the entire cache.
 */
export function invalidateAllCache(): void {
  cache.clear();
}

export const TenantIntegrationsService = {
  getCredentials,
  invalidateCache,
  invalidateAllCache,
};
