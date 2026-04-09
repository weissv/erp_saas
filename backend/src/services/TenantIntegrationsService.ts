// src/services/TenantIntegrationsService.ts
// Fetches per-tenant integration credentials from the database.
// Services call this at runtime instead of reading process.env.

import { prisma } from "../prisma";
import { config } from "../config";

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

  // AI – Embeddings (Gemini)
  geminiApiKey: string | null;

  // AI – Chat (Groq / OpenAI-compatible)
  groqApiKey: string | null;
  groqModel: string;
  groqBlitzModel: string;
  groqHeavyModel: string;

  // Google Drive
  googleDriveApiKey: string | null;
  googleDriveFolderId: string;

  // 1C OData
  oneCBaseUrl: string;
  oneCUser: string;
  oneCPassword: string;
  oneCTimeoutMs: number;
  oneCCronSchedule: string;
}

// In-memory cache with TTL per tenantId
const cache = new Map<string, { data: TenantCredentials; expiresAt: number }>();
const CACHE_TTL_MS = 60_000; // 1 minute

/**
 * Build a TenantCredentials object that falls back to process.env / config
 * values when a DB row field is null (backwards-compatible for single-tenant
 * deployments that still use .env).
 */
function buildCredentials(
  tenantId: string,
  row: {
    telegramBotToken: string | null;
    geminiApiKey: string | null;
    groqApiKey: string | null;
    groqModel: string | null;
    groqBlitzModel: string | null;
    groqHeavyModel: string | null;
    googleDriveApiKey: string | null;
    googleDriveFolderId: string | null;
    oneCBaseUrl: string | null;
    oneCUser: string | null;
    oneCPassword: string | null;
    oneCTimeoutMs: number | null;
    oneCCronSchedule: string | null;
  } | null,
): TenantCredentials {
  return {
    tenantId,
    telegramBotToken: row?.telegramBotToken ?? process.env.TELEGRAM_BOT_TOKEN?.trim() ?? null,
    geminiApiKey: row?.geminiApiKey ?? process.env.GEMINI_API_KEY ?? null,
    groqApiKey: row?.groqApiKey ?? (config.groqApiKey || null),
    groqModel: row?.groqModel ?? config.groqModel ?? "qwen/qwen3-32b",
    groqBlitzModel: row?.groqBlitzModel ?? config.groqBlitzModel ?? "llama-3.1-8b-instant",
    groqHeavyModel: row?.groqHeavyModel ?? config.groqHeavyModel ?? "openai/gpt-oss-120b",
    googleDriveApiKey: row?.googleDriveApiKey ?? process.env.GOOGLE_DRIVE_API_KEY ?? null,
    googleDriveFolderId: row?.googleDriveFolderId ?? process.env.GOOGLE_DRIVE_FOLDER_ID ?? "",
    oneCBaseUrl: row?.oneCBaseUrl ?? config.oneCBaseUrl,
    oneCUser: row?.oneCUser ?? config.oneCUser,
    oneCPassword: row?.oneCPassword ?? config.oneCPassword,
    oneCTimeoutMs: row?.oneCTimeoutMs ?? config.oneCTimeoutMs,
    oneCCronSchedule: row?.oneCCronSchedule ?? config.oneCCronSchedule,
  };
}

/**
 * Fetches (or returns cached) integration credentials for the given tenant.
 * Falls back to .env / config values for any missing DB fields.
 */
export async function getTenantIntegrations(tenantId: string): Promise<TenantCredentials> {
  // Check cache first
  const cached = cache.get(tenantId);
  if (cached && Date.now() < cached.expiresAt) {

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

    const credentials = buildCredentials(tenantId, row);

    cache.set(tenantId, {
      data: credentials,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return credentials;
  } catch (error) {
    // If the table doesn't exist yet (migration not applied), fall back gracefully
    if (
      error instanceof Error &&
      (error.message.includes("does not exist") ||
        error.message.includes("UNDEFINED_TABLE"))
    ) {
      console.warn(
        "[TenantIntegrations] Table not found — falling back to .env values",
      );
      return buildCredentials(tenantId, null);
    }

    console.error("[TenantIntegrations] Error fetching credentials:", error);
    // Return .env fallback on any error to avoid crashing the service
    return buildCredentials(tenantId, null);
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
export function invalidateTenantCache(tenantId: string): void {
export function invalidateCache(tenantId: string): void {
  cache.delete(tenantId);
}

/**
 * Clears the entire credentials cache.
 */
export function clearAllTenantCache(): void {
  cache.clear();
}

/** Default tenant ID for single-tenant / legacy deployments */
export const DEFAULT_TENANT_ID = "default";
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
