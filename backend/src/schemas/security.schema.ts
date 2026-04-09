// src/schemas/security.schema.ts
import { z } from "zod";

export const createSecurityLogSchema = z.object({
  body: z.object({
    eventType: z.enum(["INCIDENT", "FIRE_CHECK", "VISITOR_LOG", "DOCUMENT"]),
    description: z.string().optional(),
    date: z.string().datetime(),
    documentUrl: z.string().url().optional().nullable(),
  }),
});
