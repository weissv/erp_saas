import { z } from "zod";
import { Role } from "@prisma/client";

export const createNotificationSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Введите заголовок"),
    content: z.string().min(1, "Введите текст уведомления"),
    targetRole: z.nativeEnum(Role).optional().nullable(),
    targetGroupId: z.number().int().positive().optional().nullable(),
  }),
});

export const updateNotificationSchema = z.object({
  body: z.object({
    title: z.string().min(1).optional(),
    content: z.string().min(1).optional(),
    targetRole: z.nativeEnum(Role).optional().nullable(),
    targetGroupId: z.number().int().positive().optional().nullable(),
  }),
});
