// src/schemas/attendance.schema.ts
import { z } from "zod";

export const markAttendanceSchema = z.object({
  body: z.object({
    date: z.string().datetime(),
    childId: z.number().int().positive(),
    clubId: z.number().int().positive().optional().nullable(),
    isPresent: z.boolean(),
  }),
});
