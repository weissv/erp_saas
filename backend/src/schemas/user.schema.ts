// src/schemas/user.schema.ts
import { z } from "zod";

export const createUserSchema = z.object({
  body: z.object({
    email: z.string().trim().min(3, "Логин обязателен").max(128, "Логин слишком длинный"),
    password: z.string().min(8, "Пароль должен быть минимум 8 символов").max(128, "Пароль слишком длинный"),
    role: z.enum(["DEVELOPER", "DIRECTOR", "DEPUTY", "ADMIN", "TEACHER", "ACCOUNTANT", "ZAVHOZ"]),
    employeeId: z.number().int().positive("ID сотрудника обязателен"),
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    email: z.string().trim().min(3, "Логин обязателен").max(128, "Логин слишком длинный").optional(),
    password: z.string().min(8, "Пароль должен быть минимум 8 символов").max(128, "Пароль слишком длинный").optional(),
    role: z.enum(["DEVELOPER", "DIRECTOR", "DEPUTY", "ADMIN", "TEACHER", "ACCOUNTANT", "ZAVHOZ"]).optional(),
  }),
  params: z.object({ id: z.string().regex(/^\d+$/) }),
});

export const userIdParamsSchema = z.object({
  params: z.object({ id: z.string().regex(/^\d+$/) }),
});

export type CreateUserBody = z.infer<typeof createUserSchema>["body"];
export type UpdateUserBody = z.infer<typeof updateUserSchema>["body"];
