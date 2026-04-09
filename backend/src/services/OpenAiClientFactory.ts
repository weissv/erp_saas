// src/services/OpenAiClientFactory.ts
// Creates per-request OpenAI clients using the tenant's BYOK encrypted key.
// NEVER caches the client — each call decrypts the key fresh to avoid stale keys
// after revocation.

import OpenAI from "openai";
import { getDecryptedOpenAiKey } from "./TenantIntegrationsService";
import { MissingOpenAiKeyError } from "../utils/errors";

/**
 * Creates a localized OpenAI client for a single request.
 *
 * 1. Fetches the encrypted key from the DB.
 * 2. Decrypts it via EncryptionService.
 * 3. Instantiates `new OpenAI({ apiKey })` scoped to the request.
 *
 * Throws `MissingOpenAiKeyError` (428) if the tenant has not configured a key.
 */
export async function createTenantOpenAiClient(tenantId: string): Promise<OpenAI> {
  const apiKey = await getDecryptedOpenAiKey(tenantId);

  if (!apiKey) {
    throw new MissingOpenAiKeyError();
  }

  return new OpenAI({ apiKey });
}
