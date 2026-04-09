// src/schemas/procurement.schema.ts
import { z } from "zod";

const purchaseOrderItemSchema = z.object({
  name: z.string().min(1, "Наименование товара обязательно"),
  quantity: z.number().positive("Количество должно быть положительным"),
  unit: z.string().min(1, "Единица измерения обязательна"),
  price: z.number().min(0, "Цена не может быть отрицательной"),
  ingredientId: z.number().int().positive().optional().nullable(),
  inventoryItemId: z.number().int().positive().optional().nullable(),
});

export const createOrderSchema = z.object({
  body: z.object({
    type: z.enum(["PLANNED", "OPERATIONAL"]),
    supplierId: z.number().int().positive("Выберите поставщика").optional().nullable(),
    title: z.string().min(3, "Название обязательно (минимум 3 символа)"),
    description: z.string().optional(),
    priority: z.number().int().min(0).max(2).optional().default(0),
    orderDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Неверная дата").optional(),
    expectedDeliveryDate: z.string().optional().nullable(),
    budgetSource: z.string().optional(),
    items: z.array(purchaseOrderItemSchema).min(1, "Добавьте хотя бы одну позицию"),
  }),
});

export const updateOrderSchema = z.object({
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  body: z.object({
    supplierId: z.number().int().positive().optional(),
    title: z.string().min(3).optional(),
    description: z.string().optional(),
    priority: z.number().int().min(0).max(2).optional(),
    expectedDeliveryDate: z.string().optional().nullable(),
    budgetSource: z.string().optional(),
    items: z.array(purchaseOrderItemSchema).min(1).optional(),
  }),
});

export const rejectOrderSchema = z.object({
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  body: z.object({
    reason: z.string().min(3, "Укажите причину отклонения"),
  }),
});

export const receiveOrderSchema = z.object({
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  body: z.object({
    receiveNote: z.string().optional(),
    items: z.array(z.object({
      itemId: z.number().int().positive(),
      receivedQuantity: z.number().min(0),
    })).optional(),
  }),
});

export const createSupplierSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Название обязательно"),
    contactInfo: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    address: z.string().optional(),
    inn: z.string().optional(),
  }),
});

export const updateSupplierSchema = z.object({
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  body: z.object({
    name: z.string().min(2).optional(),
    contactInfo: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    address: z.string().optional(),
    inn: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});
