// src/utils/validation.ts
// Утилиты для валидации данных

import { z } from 'zod';

// ============================================================================
// БАЗОВЫЕ СХЕМЫ
// ============================================================================

/**
 * Валидатор для обязательной строки
 */
export const requiredString = (fieldName: string, minLength = 1) =>
  z.string({
    required_error: `${fieldName} обязательно`,
    invalid_type_error: `${fieldName} должно быть строкой`,
  }).min(minLength, `${fieldName} должно содержать минимум ${minLength} символ(а/ов)`);

/**
 * Валидатор для опциональной строки
 */
export const optionalString = () => z.string().optional().nullable();

/**
 * Валидатор для email
 */
export const emailSchema = z
  .string({ required_error: 'Email обязателен' })
  .email('Неверный формат email');

/**
 * Валидатор для пароля
 */
export const passwordSchema = z
  .string({ required_error: 'Пароль обязателен' })
  .min(6, 'Пароль должен содержать минимум 6 символов')
  .max(100, 'Пароль слишком длинный');

/**
 * Валидатор для телефона (российский формат)
 */
export const phoneSchema = z
  .string()
  .regex(/^(\+7|8)?[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/, 'Неверный формат телефона')
  .optional();

/**
 * Валидатор для положительного числа
 */
export const positiveNumber = (fieldName: string) =>
  z.number({
    required_error: `${fieldName} обязательно`,
    invalid_type_error: `${fieldName} должно быть числом`,
  }).positive(`${fieldName} должно быть положительным`);

/**
 * Валидатор для неотрицательного числа
 */
export const nonNegativeNumber = (fieldName: string) =>
  z.number({
    required_error: `${fieldName} обязательно`,
    invalid_type_error: `${fieldName} должно быть числом`,
  }).min(0, `${fieldName} не может быть отрицательным`);

/**
 * Валидатор для целого числа
 */
export const integerSchema = (fieldName: string) =>
  z.number({
    required_error: `${fieldName} обязательно`,
    invalid_type_error: `${fieldName} должно быть числом`,
  }).int(`${fieldName} должно быть целым числом`);

/**
 * Валидатор для ID (положительное целое число)
 */
export const idSchema = z
  .number({ required_error: 'ID обязателен' })
  .int('ID должен быть целым числом')
  .positive('ID должен быть положительным');

/**
 * Валидатор для строкового ID (для URL параметров)
 */
export const stringIdSchema = z
  .string()
  .regex(/^\d+$/, 'ID должен быть числом')
  .transform((val) => parseInt(val, 10));

/**
 * Валидатор для CUID
 */
export const cuidSchema = z.string().cuid('Неверный формат идентификатора');

// ============================================================================
// ДАТЫ
// ============================================================================

/**
 * Валидатор для даты (строка в ISO формате)
 */
export const dateStringSchema = z
  .string({ required_error: 'Дата обязательна' })
  .datetime('Неверный формат даты');

/**
 * Валидатор для даты без времени
 */
export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Формат даты: YYYY-MM-DD');

/**
 * Валидатор для времени
 */
export const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Формат времени: HH:MM');

/**
 * Преобразование строки в дату с валидацией
 */
export const coerceDate = z.coerce.date({
  required_error: 'Дата обязательна',
  invalid_type_error: 'Неверный формат даты',
});

// ============================================================================
// ПЕРЕЧИСЛЕНИЯ
// ============================================================================

export const roleSchema = z.enum([
  'DEVELOPER',
  'DIRECTOR',
  'DEPUTY',
  'ADMIN',
  'TEACHER',
  'ACCOUNTANT',
  'ZAVHOZ',
]);

export const childStatusSchema = z.enum(['ACTIVE', 'LEFT']);

export const maintenanceStatusSchema = z.enum(['NEW', 'IN_PROGRESS', 'DONE']);

export const financeTypeSchema = z.enum(['INCOME', 'EXPENSE']);

export const ageGroupSchema = z.enum(['INFANT', 'PRESCHOOL', 'ELEMENTARY']);

export const gradeTypeSchema = z.enum(['regular', 'test', 'exam', 'quarterly']);

export const lmsAttendanceStatusSchema = z.enum(['present', 'absent', 'late', 'excused']);

// ============================================================================
// ПАГИНАЦИЯ И ФИЛЬТРЫ
// ============================================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
});

export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const listQuerySchema = paginationSchema.merge(sortSchema);

// ============================================================================
// УТИЛИТЫ
// ============================================================================

/**
 * Создание схемы для формы с body
 */
export function createFormSchema<T extends z.ZodRawShape>(shape: T) {
  return z.object({
    body: z.object(shape),
  });
}

/**
 * Создание схемы для формы с body и params
 */
export function createFormSchemaWithParams<
  T extends z.ZodRawShape,
  P extends z.ZodRawShape
>(bodyShape: T, paramsShape: P) {
  return z.object({
    body: z.object(bodyShape),
    params: z.object(paramsShape),
  });
}

/**
 * Получение сообщений об ошибках из Zod ошибки
 */
export function getZodErrorMessages(error: z.ZodError): Record<string, string> {
  const messages: Record<string, string> = {};
  
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (!messages[path]) {
      messages[path] = err.message;
    }
  });
  
  return messages;
}

/**
 * Валидация данных с возвратом результата
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return { success: false, errors: getZodErrorMessages(result.error) };
}

/**
 * Безопасный парсинг с дефолтным значением
 */
export function safeParseWithDefault<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  defaultValue: T
): T {
  const result = schema.safeParse(data);
  return result.success ? result.data : defaultValue;
}
