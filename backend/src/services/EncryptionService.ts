// src/services/EncryptionService.ts
// AES-256-GCM encryption for tenant-supplied third-party API keys (BYOK).
//
// SECURITY:
// - Uses a 32-byte master ENCRYPTION_KEY from .env
// - Every encrypt() call generates a unique random IV (12 bytes)
// - GCM mode provides both confidentiality and integrity (authTag)
// - The encrypted payload, IV, and authTag are returned separately for DB storage

import crypto from "crypto";
import { config } from "../config";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const KEY_LENGTH = 32; // 256 bits

export interface EncryptedPayload {
  /** Hex-encoded ciphertext */
  encrypted: string;
  /** Hex-encoded 12-byte initialization vector */
  iv: string;
  /** Hex-encoded 16-byte GCM authentication tag */
  authTag: string;
}

/**
 * Derives the 32-byte encryption key from the ENCRYPTION_KEY env var.
 * Throws at call-time (not import-time) if the key is missing or too short.
 */
function getKey(): Buffer {
  const raw = config.encryptionKey;
  if (!raw) {
    throw new Error(
      "ENCRYPTION_KEY is not set. Cannot encrypt/decrypt tenant API keys.",
    );
  }

  // If the env var is already 64 hex chars (32 bytes), use it directly.
  if (/^[0-9a-f]{64}$/i.test(raw)) {
    return Buffer.from(raw, "hex");
  }

  // Otherwise derive a deterministic key via SHA-256.
  return crypto.createHash("sha256").update(raw).digest();
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 */
export function encrypt(plaintext: string): EncryptedPayload {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

/**
 * Decrypts an AES-256-GCM encrypted payload back to plaintext.
 */
export function decrypt(payload: EncryptedPayload): string {
  const key = getKey();

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(payload.iv, "hex"),
  );
  decipher.setAuthTag(Buffer.from(payload.authTag, "hex"));

  let decrypted = decipher.update(payload.encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Masks an API key for safe display: shows the first prefix and last 4 chars.
 * Example: "sk-proj-abcdef1234567890" → "sk-proj-...7890"
 */
export function maskApiKey(key: string): string {
  if (key.length <= 8) return "****";

  // Keep the prefix (e.g. "sk-" or "sk-proj-") and last 4 chars
  const dashIdx = key.indexOf("-", 3); // find second dash
  const prefixEnd = dashIdx > 0 && dashIdx < 12 ? dashIdx + 1 : 3;
  const prefix = key.slice(0, prefixEnd);
  const suffix = key.slice(-4);

  return `${prefix}...${suffix}`;
}

export const EncryptionService = {
  encrypt,
  decrypt,
  maskApiKey,
};
