// src/schemas/onec-push.schema.ts
// Zod validation schema for incoming 1C push payloads.

import { z } from "zod";

/**
 * A single entity record pushed from 1C.
 * Accepts arbitrary key-value data — the worker decides how to map it.
 */
const oneCPushRecordSchema = z.record(z.string(), z.unknown());

/**
 * A batch of records for one entity type (e.g. "Контрагенты", "ФизическиеЛица").
 */
const oneCPushEntityBatchSchema = z.object({
  /** 1C entity name, e.g. "Catalog_Контрагенты" or "Document_ПоступлениеНаРасчетныйСчет" */
  entity: z.string().min(1).max(256),
  /** Array of records to upsert */
  records: z.array(oneCPushRecordSchema).min(1).max(10_000),
});

/**
 * Top-level payload that 1C Extension sends to POST /api/v1/integration/1c/sync.
 */
export const oneCPushPayloadSchema = z.object({
  /** Optional: version of the 1C extension sending the data */
  version: z.string().max(32).optional(),
  /** One or more entity batches */
  batches: z.array(oneCPushEntityBatchSchema).min(1).max(50),
});

export type OneCPushPayload = z.infer<typeof oneCPushPayloadSchema>;
export type OneCPushEntityBatch = z.infer<typeof oneCPushEntityBatchSchema>;
