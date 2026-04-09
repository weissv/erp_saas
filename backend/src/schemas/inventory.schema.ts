// src/schemas/inventory.schema.ts
import { z } from "zod";

export const listInventorySchema = z.object({
  query: z.record(z.any()).optional(),
});

export const createInventorySchema = z.object({
  body: z.object({
    name: z.string().min(1, "Название обязательно"),
    quantity: z.number().min(0, "Количество должно быть >= 0"),
    unit: z.string().min(1, "Единица измерения обязательна"),
    expiryDate: z.string().nullable().optional(),
    type: z.enum(["FOOD", "HOUSEHOLD", "STATIONERY"]).optional().default("FOOD"),
    minQuantity: z.number().min(0).optional().default(0),
  }),
});

export const updateInventorySchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    quantity: z.number().min(0).optional(),
    unit: z.string().min(1).optional(),
    expiryDate: z.string().nullable().optional(),
    type: z.enum(["FOOD", "HOUSEHOLD", "STATIONERY"]).optional(),
    minQuantity: z.number().min(0).optional(),
  }),
});

export const generateShoppingListSchema = z.object({
  body: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  }),
});
