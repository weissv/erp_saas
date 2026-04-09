// src/schemas/club.schema.ts
import { z } from "zod";

export const createClubSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    description: z.string().optional(),
    teacherId: z.number().int().positive(),
    schedule: z.array(z.object({ day: z.string(), time: z.string() })).optional(),
    cost: z.coerce.number().nonnegative(),
    maxStudents: z.number().int().positive(),
  }),
});

export const enrollClubSchema = z.object({
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  body: z.object({ childId: z.number().int().positive() }),
});
