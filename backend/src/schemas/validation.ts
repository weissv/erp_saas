// src/schemas/validation.ts
// Общие схемы валидации для backend API

import { z } from 'zod';
import { PAGINATION_DEFAULTS, SORT_ORDERS } from '../constants';

// ============================================================================
// БАЗОВЫЕ СХЕМЫ
// ============================================================================

/**
 * Схема для обязательной строки
 */
export const requiredString = (fieldName: string, minLength = 1, maxLength = 255) =>
  z.string({
    required_error: `${fieldName} обязательно`,
    invalid_type_error: `${fieldName} должно быть строкой`,
  })
    .min(minLength, `${fieldName} должно содержать минимум ${minLength} символ(а/ов)`)
    .max(maxLength, `${fieldName} не должно превышать ${maxLength} символов`);

/**
 * Опциональная строка
 */
export const optionalString = () => z.string().optional().nullable();

/**
 * Email схема
 */
export const emailSchema = z
  .string({ required_error: 'Email обязателен' })
  .email('Неверный формат email')
  .max(255, 'Email слишком длинный');

/**
 * Пароль схема
 */
export const passwordSchema = z
  .string({ required_error: 'Пароль обязателен' })
  .min(6, 'Пароль должен содержать минимум 6 символов')
  .max(100, 'Пароль слишком длинный');

/**
 * Телефон схема
 */
export const phoneSchema = z
  .string()
  .regex(/^(\+7|8)?[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/, 'Неверный формат телефона')
  .optional()
  .nullable();

/**
 * ID схема (положительное целое)
 */
export const idSchema = z
  .number({ required_error: 'ID обязателен' })
  .int('ID должен быть целым числом')
  .positive('ID должен быть положительным');

/**
 * ID из URL параметра
 */
export const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID должен быть числом').transform((val) => parseInt(val, 10)),
});

/**
 * Положительное число
 */
export const positiveNumber = (fieldName: string) =>
  z.number({
    required_error: `${fieldName} обязательно`,
    invalid_type_error: `${fieldName} должно быть числом`,
  }).positive(`${fieldName} должно быть положительным`);

/**
 * Неотрицательное число
 */
export const nonNegativeNumber = (fieldName: string) =>
  z.number({
    required_error: `${fieldName} обязательно`,
    invalid_type_error: `${fieldName} должно быть числом`,
  }).min(0, `${fieldName} не может быть отрицательным`);

/**
 * Целое число
 */
export const integerSchema = (fieldName: string) =>
  z.number({
    required_error: `${fieldName} обязательно`,
    invalid_type_error: `${fieldName} должно быть числом`,
  }).int(`${fieldName} должно быть целым числом`);

/**
 * Сумма денег (до 2 знаков после запятой)
 */
export const moneySchema = (fieldName: string) =>
  z.number({
    required_error: `${fieldName} обязательно`,
    invalid_type_error: `${fieldName} должно быть числом`,
  })
    .multipleOf(0.01, `${fieldName} может иметь максимум 2 знака после запятой`)
    .min(0, `${fieldName} не может быть отрицательной`);

// ============================================================================
// ДАТЫ
// ============================================================================

/**
 * Дата в ISO формате
 */
export const dateStringSchema = z
  .string({ required_error: 'Дата обязательна' })
  .datetime({ message: 'Неверный формат даты' });

/**
 * Дата без времени (YYYY-MM-DD)
 */
export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Формат даты: YYYY-MM-DD');

/**
 * Время (HH:MM)
 */
export const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Формат времени: HH:MM');

/**
 * Преобразование строки в Date
 */
export const coerceDate = z.coerce.date({
  required_error: 'Дата обязательна',
  invalid_type_error: 'Неверный формат даты',
});

/**
 * Опциональная дата
 */
export const optionalDateSchema = z.coerce.date().optional().nullable();

// ============================================================================
// ПЕРЕЧИСЛЕНИЯ (ENUMS)
// ============================================================================

export const roleSchema = z.enum([
  'DEVELOPER',
  'DIRECTOR',
  'DEPUTY',
  'ADMIN',
  'TEACHER',
  'ACCOUNTANT',
  'ZAVHOZ',
], { 
  required_error: 'Роль обязательна',
  invalid_type_error: 'Неверная роль' 
});

export const childStatusSchema = z.enum(['ACTIVE', 'LEFT'], {
  required_error: 'Статус обязателен',
  invalid_type_error: 'Неверный статус',
});

export const maintenanceStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'DONE'], {
  required_error: 'Статус обязателен',
  invalid_type_error: 'Неверный статус',
});

export const financeTypeSchema = z.enum(['INCOME', 'EXPENSE'], {
  required_error: 'Тип обязателен',
  invalid_type_error: 'Неверный тип',
});

export const ageGroupSchema = z.enum(['INFANT', 'PRESCHOOL', 'ELEMENTARY'], {
  required_error: 'Возрастная группа обязательна',
  invalid_type_error: 'Неверная возрастная группа',
});

export const gradeTypeSchema = z.enum(['regular', 'test', 'exam', 'quarterly'], {
  required_error: 'Тип оценки обязателен',
  invalid_type_error: 'Неверный тип оценки',
});

export const lmsAttendanceStatusSchema = z.enum(['present', 'absent', 'late', 'excused'], {
  required_error: 'Статус посещения обязателен',
  invalid_type_error: 'Неверный статус посещения',
});

// ============================================================================
// ПАГИНАЦИЯ И СОРТИРОВКА
// ============================================================================

export const paginationSchema = z.object({
  page: z.coerce
    .number()
    .int()
    .positive()
    .default(PAGINATION_DEFAULTS.PAGE),
  pageSize: z.coerce
    .number()
    .int()
    .positive()
    .max(PAGINATION_DEFAULTS.MAX_PAGE_SIZE)
    .default(PAGINATION_DEFAULTS.PAGE_SIZE),
});

export const sortOrderSchema = z.enum([SORT_ORDERS.ASC, SORT_ORDERS.DESC] as const);

export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: sortOrderSchema.default(SORT_ORDERS.ASC),
});

export const listQuerySchema = paginationSchema.merge(sortSchema).extend({
  search: z.string().optional(),
});

// ============================================================================
// ФИЛЬТРЫ
// ============================================================================

/**
 * Фильтр по диапазону дат
 */
export const dateRangeSchema = z.object({
  startDate: dateOnlySchema.optional(),
  endDate: dateOnlySchema.optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  { message: 'Начальная дата не может быть позже конечной' }
);

/**
 * Фильтр по диапазону чисел
 */
export const numberRangeSchema = (fieldName: string) =>
  z.object({
    min: z.coerce.number().optional(),
    max: z.coerce.number().optional(),
  }).refine(
    (data) => {
      if (data.min !== undefined && data.max !== undefined) {
        return data.min <= data.max;
      }
      return true;
    },
    { message: `Минимальное ${fieldName} не может быть больше максимального` }
  );

// ============================================================================
// УТИЛИТЫ
// ============================================================================

/**
 * Создание схемы запроса с params
 */
export function createParamsSchema<T extends z.ZodRawShape>(shape: T) {
  return z.object({ params: z.object(shape) });
}

/**
 * Создание схемы запроса с body
 */
export function createBodySchema<T extends z.ZodRawShape>(shape: T) {
  return z.object({ body: z.object(shape) });
}

/**
 * Создание схемы запроса с query
 */
export function createQuerySchema<T extends z.ZodRawShape>(shape: T) {
  return z.object({ query: z.object(shape) });
}

/**
 * Создание полной схемы запроса
 */
export function createRequestSchema<
  P extends z.ZodRawShape = Record<string, never>,
  B extends z.ZodRawShape = Record<string, never>,
  Q extends z.ZodRawShape = Record<string, never>
>(options: {
  params?: P;
  body?: B;
  query?: Q;
}) {
  const schema: Record<string, z.ZodTypeAny> = {};
  
  if (options.params) {
    schema.params = z.object(options.params);
  }
  if (options.body) {
    schema.body = z.object(options.body);
  }
  if (options.query) {
    schema.query = z.object(options.query);
  }
  
  return z.object(schema);
}

/**
 * Получение сообщений об ошибках из ZodError
 */
export function formatZodErrors(error: z.ZodError): Record<string, string> {
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
 * Безопасный парсинг с дефолтом
 */
export function safeParseWithDefault<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  defaultValue: T
): T {
  const result = schema.safeParse(data);
  return result.success ? result.data : defaultValue;
}

/**
 * Валидация и возврат результата
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return { success: false, errors: formatZodErrors(result.error) };
}

// ============================================================================
// ОБЩИЕ СХЕМЫ СУЩНОСТЕЙ
// ============================================================================

/**
 * Базовая схема для создания сотрудника
 */
export const createEmployeeSchema = z.object({
  fullName: requiredString('Полное имя', 2, 255),
  email: emailSchema,
  phone: phoneSchema,
  role: roleSchema,
  position: requiredString('Должность', 2, 255).optional(),
  salary: moneySchema('Зарплата').optional(),
  password: passwordSchema,
  birthDate: optionalDateSchema,
});

/**
 * Схема обновления сотрудника
 */
export const updateEmployeeSchema = createEmployeeSchema.partial().omit({ password: true }).extend({
  password: passwordSchema.optional(),
});

/**
 * Схема создания ребенка
 */
export const createChildSchema = z.object({
  fullName: requiredString('Полное имя', 2, 255),
  birthDate: coerceDate,
  groupId: idSchema,
  parentName: requiredString('Имя родителя', 2, 255).optional(),
  parentPhone: phoneSchema,
  parentEmail: emailSchema.optional().nullable(),
  address: optionalString(),
  allergies: optionalString(),
  medicalNotes: optionalString(),
  status: childStatusSchema.default('ACTIVE'),
});

/**
 * Схема обновления ребенка
 */
export const updateChildSchema = createChildSchema.partial();

/**
 * Схема создания группы
 */
export const createGroupSchema = z.object({
  name: requiredString('Название группы', 2, 100),
  ageGroup: ageGroupSchema.optional(),
  maxCapacity: integerSchema('Максимальная вместимость').positive().optional(),
  teacherId: idSchema.optional(),
});

/**
 * Схема создания финансовой операции
 */
export const createFinanceSchema = z.object({
  type: financeTypeSchema,
  category: requiredString('Категория', 2, 100),
  amount: moneySchema('Сумма').positive(),
  description: optionalString(),
  date: coerceDate,
});

/**
 * Схема создания задачи обслуживания
 */
export const createMaintenanceSchema = z.object({
  title: requiredString('Название', 3, 255),
  description: optionalString(),
  status: maintenanceStatusSchema.default('PENDING'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  assignedTo: idSchema.optional(),
  dueDate: optionalDateSchema,
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type CreateChildInput = z.infer<typeof createChildSchema>;
export type UpdateChildInput = z.infer<typeof updateChildSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type CreateFinanceInput = z.infer<typeof createFinanceSchema>;
export type CreateMaintenanceInput = z.infer<typeof createMaintenanceSchema>;
