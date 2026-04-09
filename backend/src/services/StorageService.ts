// src/services/StorageService.ts
// Tenant-scoped wrapper for S3-compatible object storage (AWS S3 / Cloudflare R2).
// Enforces strict pathing: /{tenantId}/{userId}/{filename}
// Prevents directory-traversal across tenants.

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import path from "path";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// Configuration — read once at module load
// ---------------------------------------------------------------------------
const STORAGE_BUCKET = process.env.STORAGE_BUCKET || "erp-uploads";
const STORAGE_REGION = process.env.STORAGE_REGION || "auto";
const STORAGE_ENDPOINT = process.env.STORAGE_ENDPOINT || undefined; // R2 endpoint
const STORAGE_ACCESS_KEY = process.env.STORAGE_ACCESS_KEY || "";
const STORAGE_SECRET_KEY = process.env.STORAGE_SECRET_KEY || "";

// Limit individual uploads to 50 MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// ---------------------------------------------------------------------------
// S3 client singleton
// ---------------------------------------------------------------------------
let _client: S3Client | null = null;

function getClient(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: STORAGE_REGION,
      ...(STORAGE_ENDPOINT ? { endpoint: STORAGE_ENDPOINT } : {}),
      credentials: {
        accessKeyId: STORAGE_ACCESS_KEY,
        secretAccessKey: STORAGE_SECRET_KEY,
      },
      // For Cloudflare R2 compatibility
      forcePathStyle: true,
    });
  }
  return _client;
}

// ---------------------------------------------------------------------------
// Path safety helpers
// ---------------------------------------------------------------------------

/**
 * Returns a safe, traversal-free key in the form:
 *   {tenantId}/{userId}/{sanitizedFilename}
 *
 * Throws if any segment is missing or contains traversal characters.
 */
function buildSafeKey(
  tenantId: string,
  userId: string,
  filename: string
): string {
  // Validate identifiers (only alphanumeric, hyphens, underscores)
  const idPattern = /^[a-zA-Z0-9_-]+$/;

  if (!tenantId || !idPattern.test(tenantId)) {
    throw new Error("Invalid tenantId: must be alphanumeric, hyphens, or underscores");
  }
  if (!userId || !idPattern.test(userId)) {
    throw new Error("Invalid userId: must be alphanumeric, hyphens, or underscores");
  }
  if (!filename || filename.length === 0) {
    throw new Error("Filename must not be empty");
  }

  // Sanitise the filename:
  //   1. Take only the base name (no directory component).
  //   2. Remove any null bytes or control characters.
  //   3. Collapse multiple dots (prevents ".." tricks).
  const baseName = path.basename(filename);
  const sanitized = baseName
    .replace(/[\x00-\x1f]/g, "") // strip control chars
    .replace(/\.{2,}/g, ".")     // collapse consecutive dots
    .replace(/[/\\]/g, "_");     // just in case

  if (!sanitized || sanitized === "." || sanitized === "..") {
    throw new Error("Invalid filename after sanitisation");
  }

  // Prefix with a short random token to avoid collisions
  const token = crypto.randomBytes(6).toString("hex");
  return `${tenantId}/${userId}/${token}_${sanitized}`;
}

/**
 * Verify that a given key belongs to the specified tenant.
 * Prevents one tenant from accessing another tenant's files.
 */
function assertTenantOwnership(key: string, tenantId: string): void {
  const normalised = key.replace(/\\/g, "/");
  if (!normalised.startsWith(`${tenantId}/`)) {
    throw new Error("Access denied: key does not belong to this tenant");
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface UploadResult {
  key: string;
  bucket: string;
  size: number;
  contentType: string;
}

/**
 * Upload a file to tenant-scoped storage.
 */
async function upload(
  tenantId: string,
  userId: string,
  filename: string,
  body: Buffer | Uint8Array | ReadableStream,
  contentType: string
): Promise<UploadResult> {
  const bodyBuffer = body instanceof Buffer ? body : Buffer.from(body as Uint8Array);

  if (bodyBuffer.length > MAX_FILE_SIZE) {
    throw new Error(`File exceeds maximum size of ${MAX_FILE_SIZE / (1024 * 1024)} MB`);
  }

  const key = buildSafeKey(tenantId, userId, filename);

  await getClient().send(
    new PutObjectCommand({
      Bucket: STORAGE_BUCKET,
      Key: key,
      Body: bodyBuffer,
      ContentType: contentType,
    })
  );

  return {
    key,
    bucket: STORAGE_BUCKET,
    size: bodyBuffer.length,
    contentType,
  };
}

/**
 * Get an object (stream) from tenant-scoped storage.
 */
async function download(tenantId: string, key: string) {
  assertTenantOwnership(key, tenantId);

  const result = await getClient().send(
    new GetObjectCommand({
      Bucket: STORAGE_BUCKET,
      Key: key,
    })
  );

  return {
    body: result.Body,
    contentType: result.ContentType,
    contentLength: result.ContentLength,
  };
}

/**
 * Check whether a key exists and belongs to the tenant.
 */
async function exists(tenantId: string, key: string): Promise<boolean> {
  assertTenantOwnership(key, tenantId);

  try {
    await getClient().send(
      new HeadObjectCommand({ Bucket: STORAGE_BUCKET, Key: key })
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete a file from tenant-scoped storage.
 */
async function remove(tenantId: string, key: string): Promise<void> {
  assertTenantOwnership(key, tenantId);

  await getClient().send(
    new DeleteObjectCommand({ Bucket: STORAGE_BUCKET, Key: key })
  );
}

export const StorageService = {
  upload,
  download,
  exists,
  remove,
  /** Exposed for testing */
  buildSafeKey,
  assertTenantOwnership,
  MAX_FILE_SIZE,
};
