// src/schemas/employee.schema.ts
import { z } from "zod";

export const createEmployeeSchema = z.object({
  body: z.object({
    firstName: z.string().min(2, "Имя обязательно"),
    lastName: z.string().min(2, "Фамилия обязательна"),
    middleName: z.string().optional(),
    birthDate: z.string().datetime().nullable().optional(),
    position: z.string().min(2, "Должность обязательна"),
    rate: z.number().positive("Ставка должна быть > 0"),
    hireDate: z.string().datetime("Неверный формат даты"),
    fireDate: z.string().datetime().nullable().optional(),
    contractEndDate: z.string().datetime().nullable().optional(),
    medicalCheckupDate: z.string().datetime().nullable().optional(),
    attestationDate: z.string().datetime().nullable().optional(),
    user: z
      .object({
        email: z.string().email(),
        password: z.string().min(6),
        role: z.enum(["DIRECTOR", "DEPUTY", "ADMIN", "TEACHER", "ACCOUNTANT"]),
      })
      .optional(),
  }),
});

export const updateEmployeeSchema = z.object({
  body: createEmployeeSchema.shape.body.partial(),
  params: z.object({ id: z.string().regex(/^\d+$/) }),
});
