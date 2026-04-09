import { createHash } from "node:crypto";
import { AxiosInstance } from "axios";
import { PrismaClient } from "@prisma/client";
import type { OneCSyncResult as SyncResult } from "../contracts";
import { logger } from "../../../../utils/logger";

export type { SyncResult };

/**
 * Parses a numeric amount from 1C OData safely.
 * Correctly handles zero (returns 0, not null).
 * Returns null for undefined/null/NaN values.
 */
export function parseAmount(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const n = typeof val === "number" ? val : parseFloat(String(val));
  return isNaN(n) ? null : n;
}

/**
 * Number of records per OData page request.
 * 1C typically limits to 1000, we use 1000 to minimize round-trips.
 */
const PAGE_SIZE = 1000;

/**
 * Number of Prisma upserts to execute in parallel per chunk.
 * Keeps the DB connection pool healthy while providing parallelism.
 */
export const UPSERT_CHUNK_SIZE = 100;

export const EMPTY_GUID = "00000000-0000-0000-0000-000000000000";

/**
 * Per-request timeout override for OData fetches (60s).
 * Overrides the client default to give 1C enough time for large datasets.
 */
const FETCH_TIMEOUT_MS = 60_000;

export class SyncContext {
  constructor(
    public readonly client: AxiosInstance,
    public readonly db: PrismaClient,
  ) {}

  /**
   * Fetches ALL records from a 1C OData entity using manual $skip/$top pagination.
   *
   * Strategy:
   * - Uses $skip + $top pagination until a page returns 0 items.
   * - Does NOT follow odata.nextLink — 1C behind a proxy returns malformed nextLink
   *   URLs (pointing to localhost) which cause fetch failures.
   * - Advances $skip by the actual number of items received (not PAGE_SIZE) to handle
   *   proxy-capped responses where the server returns fewer records than requested.
   *   This prevents premature termination when the proxy caps page size below PAGE_SIZE.
   * - No artificial MAX_PAGES ceiling — fetches until the entity is fully drained.
   */
  async fetchAll<T = Record<string, unknown>>(
    entity: string,
    filter?: string,
    select?: string,
  ): Promise<T[]> {
    const results: T[] = [];
    let skip = 0;
    let pageIndex = 0;

    const baseParams: Record<string, string> = {
      $format: "json",
      $top: String(PAGE_SIZE),
    };
    if (filter) baseParams.$filter = filter;
    if (select) baseParams.$select = select;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const params = { ...baseParams, $skip: String(skip) };
      const url = `/${encodeURIComponent(entity)}`;
      const resp: any = await this.client.get(url, {
        params,
        timeout: FETCH_TIMEOUT_MS,
      });
      const items: T[] = resp.data?.value ?? [];

      results.push(...items);
      pageIndex++;

      // Log progress for large entities
      if (pageIndex % 10 === 0) {
        logger.info(
          `[1C-Sync] fetchAll "${entity}": ${results.length} records fetched so far (page ${pageIndex})...`,
        );
      }

      // Empty page means we've reached the end of data.
      // NOTE: We stop on empty (not on partial) because the 1C OData endpoint sits behind
      // a reverse-proxy that caps each response to fewer records than PAGE_SIZE. Stopping
      // on `items.length < PAGE_SIZE` would terminate the loop after the very first page,
      // causing entire date ranges (e.g. December 2025) to be silently skipped.
      if (items.length === 0) {
        break;
      }

      // Advance skip by the actual number of items received, not by PAGE_SIZE.
      // When the proxy caps the page the two values differ, and using PAGE_SIZE would
      // leave a gap between pages, missing records in that gap.
      skip += items.length;
    }

    logger.info(
      `[1C-Sync] fetchAll "${entity}": completed — ${results.length} total records in ${pageIndex} page(s)`,
    );

    return results;
  }

  /**
   * Processes an array of items in chunks, executing `processor` for each item.
   * Uses Promise.allSettled to ensure a single failure does not break the batch.
   *
   * Returns { upserted, errors } counts.
   */
  async processInChunks<T>(
    items: T[],
    entityLabel: string,
    processor: (item: T) => Promise<void>,
    chunkSize: number = UPSERT_CHUNK_SIZE,
  ): Promise<{ upserted: number; errors: number }> {
    let upserted = 0;
    let errors = 0;

    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const results = await Promise.allSettled(
        chunk.map((item) => processor(item)),
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          upserted++;
        } else {
          errors++;
          logger.error(
            `[1C-Sync] ${entityLabel} chunk upsert error:`,
            result.reason?.message ?? String(result.reason),
          );
        }
      }
    }

    return { upserted, errors };
  }

  buildRegisterExternalId(registerType: string, row: Record<string, unknown>): string {
    if (typeof row.Ref_Key === "string" && row.Ref_Key && row.Ref_Key !== EMPTY_GUID) {
      return row.Ref_Key;
    }

    const normalizedEntries = Object.entries(row)
      .filter(([key]) => key !== "DataVersion")
      .sort(([left], [right]) => left.localeCompare(right));

    const normalizedRow = Object.fromEntries(normalizedEntries);
    const payload = JSON.stringify(normalizedRow);
    return `${registerType}_${createHash("sha256").update(payload).digest("hex")}`;
  }
}
