// src/constants/index.ts
// Централизованные константы для всего приложения

// ============================================================================
// РОЛИ И РАЗРЕШЕНИЯ
// ============================================================================

export const ROLES = {
  DEVELOPER: 'DEVELOPER',
  DIRECTOR: 'DIRECTOR', 
  DEPUTY: 'DEPUTY',
  ADMIN: 'ADMIN',
  TEACHER: 'TEACHER',
  ACCOUNTANT: 'ACCOUNTANT',
  ZAVHOZ: 'ZAVHOZ',
} as const;

export type Role = keyof typeof ROLES;

// Роли с полным доступом ко всем функциям системы
export const FULL_ACCESS_ROLES: readonly Role[] = ['DEVELOPER', 'DIRECTOR'] as const;

// Административные роли (могут создавать/редактировать данные)
export const ADMIN_ROLES: readonly Role[] = ['DEVELOPER', 'DIRECTOR', 'DEPUTY', 'ADMIN'] as const;

// Роли с доступом к обучению
export const TEACHING_ROLES: readonly Role[] = ['DEVELOPER', 'DIRECTOR', 'DEPUTY', 'ADMIN', 'TEACHER'] as const;

// Роли с доступом к финансам  
export const FINANCE_ROLES: readonly Role[] = ['DEVELOPER', 'DIRECTOR', 'DEPUTY', 'ADMIN', 'ACCOUNTANT'] as const;

// ============================================================================
// СТАТУСЫ
// ============================================================================

export const CHILD_STATUS = {
  ACTIVE: 'ACTIVE',
  LEFT: 'LEFT',
} as const;

export type ChildStatus = keyof typeof CHILD_STATUS;

export const CLUB_ENROLLMENT_STATUS = {
  ACTIVE: 'ACTIVE',
  WAITING_LIST: 'WAITING_LIST',
  CANCELLED: 'CANCELLED',
} as const;

export type ClubEnrollmentStatus = keyof typeof CLUB_ENROLLMENT_STATUS;

export const MAINTENANCE_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
} as const;

export type MaintenanceStatus = keyof typeof MAINTENANCE_STATUS;

export const EMPLOYEE_ATTENDANCE_STATUS = {
  PRESENT: 'PRESENT',
  SICK_LEAVE: 'SICK_LEAVE',
  VACATION: 'VACATION',
  ABSENT: 'ABSENT',
} as const;

export type EmployeeAttendanceStatus = keyof typeof EMPLOYEE_ATTENDANCE_STATUS;

export const LMS_STUDENT_STATUS = {
  ACTIVE: 'active',
  GRADUATED: 'graduated',
  TRANSFERRED: 'transferred',
} as const;

export type LmsStudentStatus = typeof LMS_STUDENT_STATUS[keyof typeof LMS_STUDENT_STATUS];

export const LMS_ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LATE: 'late',
  EXCUSED: 'excused',
} as const;

export type LmsAttendanceStatus = typeof LMS_ATTENDANCE_STATUS[keyof typeof LMS_ATTENDANCE_STATUS];

export const GRADE_TYPE = {
  REGULAR: 'regular',
  TEST: 'test',
  EXAM: 'exam',
  QUARTERLY: 'quarterly',
} as const;

export type GradeType = typeof GRADE_TYPE[keyof typeof GRADE_TYPE];

export const HOMEWORK_STATUS = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
} as const;

export type HomeworkStatus = typeof HOMEWORK_STATUS[keyof typeof HOMEWORK_STATUS];

// ============================================================================
// ТИПЫ ДАННЫХ
// ============================================================================

export const FINANCE_TYPE = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
} as const;

export type FinanceType = keyof typeof FINANCE_TYPE;

export const FINANCE_CATEGORY = {
  NUTRITION: 'NUTRITION',
  CLUBS: 'CLUBS',
  MAINTENANCE: 'MAINTENANCE',
  SALARY: 'SALARY',
} as const;

export type FinanceCategory = keyof typeof FINANCE_CATEGORY;

export const FINANCE_SOURCE = {
  BUDGET: 'BUDGET',
  EXTRA_BUDGET: 'EXTRA_BUDGET',
} as const;

export type FinanceSource = keyof typeof FINANCE_SOURCE;

export const INVENTORY_TYPE = {
  FOOD: 'FOOD',
  HOUSEHOLD: 'HOUSEHOLD',
  STATIONERY: 'STATIONERY',
} as const;

export type InventoryType = keyof typeof INVENTORY_TYPE;

export const MAINTENANCE_TYPE = {
  REPAIR: 'REPAIR',
  ISSUE: 'ISSUE',
} as const;

export type MaintenanceType = keyof typeof MAINTENANCE_TYPE;

export const SECURITY_EVENT_TYPE = {
  INCIDENT: 'INCIDENT',
  FIRE_CHECK: 'FIRE_CHECK',
  VISITOR_LOG: 'VISITOR_LOG',
  DOCUMENT: 'DOCUMENT',
} as const;

export type SecurityEventType = keyof typeof SECURITY_EVENT_TYPE;

export const AGE_GROUP = {
  INFANT: 'INFANT',      // Ясли (0-3)
  PRESCHOOL: 'PRESCHOOL', // Дошкольники (3-7)
  ELEMENTARY: 'ELEMENTARY', // Младшая школа (7-11)
} as const;

export type AgeGroup = keyof typeof AGE_GROUP;

export const FEEDBACK_TYPE = {
  COMPLAINT: 'Жалоба',
  SUGGESTION: 'Предложение',
  REQUEST: 'Обращение',
} as const;

export const FEEDBACK_STATUS = {
  NEW: 'NEW',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
} as const;

export type FeedbackStatus = keyof typeof FEEDBACK_STATUS;

// ============================================================================
// ПАГИНАЦИЯ
// ============================================================================

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MIN_PAGE_SIZE: 1,
  MAX_PAGE_SIZE: 200,
} as const;

// Pagination defaults for validation schemas
export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  PAGE_SIZE: 20,
  MIN_PAGE_SIZE: 1,
  MAX_PAGE_SIZE: 200,
} as const;

// Sort orders
export const SORT_ORDERS = {
  ASC: 'asc',
  DESC: 'desc',
} as const;
export type SortOrder = typeof SORT_ORDERS[keyof typeof SORT_ORDERS];

// ============================================================================
// ВРЕМЕННЫЕ КОНСТАНТЫ
// ============================================================================

export const TIME = {
  HOUR_MS: 60 * 60 * 1000,
  DAY_MS: 24 * 60 * 60 * 1000,
  WEEK_MS: 7 * 24 * 60 * 60 * 1000,
  MONTH_MS: 30 * 24 * 60 * 60 * 1000,
} as const;

export const JWT = {
  EXPIRES_IN: '12h',
  COOKIE_NAME: 'auth_token',
  COOKIE_MAX_AGE: 12 * 60 * 60 * 1000, // 12 часов
} as const;

// ============================================================================
// НАСТРОЙКИ ФАЙЛОВ
// ============================================================================

export const FILE = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
} as const;

// ============================================================================
// ДНИ НЕДЕЛИ
// ============================================================================

export const DAYS_OF_WEEK = {
  1: 'Понедельник',
  2: 'Вторник',
  3: 'Среда',
  4: 'Четверг',
  5: 'Пятница',
  6: 'Суббота',
  7: 'Воскресенье',
} as const;

export const DAYS_SHORT = {
  1: 'Пн',
  2: 'Вт',
  3: 'Ср',
  4: 'Чт',
  5: 'Пт',
  6: 'Сб',
  7: 'Вс',
} as const;

// ============================================================================
// ОЦЕНКИ
// ============================================================================

export const GRADE_SCALE = {
  MIN: 1,
  MAX: 5,
  DEFAULT_MAX: 100,
  PASSING: 3,
} as const;

export const GRADE_COLORS = {
  EXCELLENT: 'green',  // 5 / 90-100
  GOOD: 'blue',        // 4 / 75-89
  SATISFACTORY: 'orange', // 3 / 60-74
  POOR: 'red',         // 2-1 / 0-59
} as const;

// ============================================================================
// СООБЩЕНИЯ
// ============================================================================

export const MESSAGES = {
  // Успех
  CREATED: 'Успешно создано',
  UPDATED: 'Успешно обновлено',
  DELETED: 'Успешно удалено',
  
  // Ошибки аутентификации
  UNAUTHORIZED: 'Требуется авторизация',
  FORBIDDEN: 'Недостаточно прав доступа',
  INVALID_CREDENTIALS: 'Неверные учётные данные',
  TOKEN_EXPIRED: 'Сессия истекла',
  
  // Ошибки валидации
  VALIDATION_ERROR: 'Ошибка валидации данных',
  INVALID_ID: 'Неверный идентификатор',
  NOT_FOUND: 'Запись не найдена',
  ALREADY_EXISTS: 'Запись уже существует',
  
  // Ошибки сервера
  SERVER_ERROR: 'Внутренняя ошибка сервера',
  DATABASE_ERROR: 'Ошибка базы данных',
} as const;

// ============================================================================
// HTTP КОДЫ
// ============================================================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;
