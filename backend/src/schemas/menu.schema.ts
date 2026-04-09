// src/schemas/menu.schema.ts
import { z } from "zod";

export const getMenuSchema = z.object({
  query: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
});

export const upsertMenuSchema = z.object({
  body: z.object({
    date: z.string().datetime(),
    ageGroup: z.string().min(1),
    meals: z.array(
      z.object({
        name: z.string(),
        dish: z.string(),
        calories: z.number().optional(),
        ingredients: z
          .array(
            z.object({
              name: z.string(),
              qty: z.coerce.number(),
              unit: z.string(),
            })
          )
          .optional(),
      })
    ),
  }),
});
