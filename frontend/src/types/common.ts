// src/types/common.ts
// Общие типы для всего приложения

// ============================================================================
// ПАГИНАЦИЯ
// ============================================================================

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ListParams extends PaginationParams, SortParams {
  search?: string;
  [key: string]: any;
}

// ============================================================================
// API ОТВЕТЫ
// ============================================================================

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================================================
// БАЗОВЫЕ СУЩНОСТИ
// ============================================================================

export interface BaseEntity {
  id: number;
  createdAt: string;
  updatedAt: string;
}

export interface BaseEntityWithCuid {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// РОЛИ И РАЗРЕШЕНИЯ
// ============================================================================

export type Role = 'DEVELOPER' | 'DIRECTOR' | 'DEPUTY' | 'ADMIN' | 'TEACHER' | 'ACCOUNTANT' | 'ZAVHOZ';

export const FULL_ACCESS_ROLES: readonly Role[] = ['DEVELOPER', 'DIRECTOR'];
export const ADMIN_ROLES: readonly Role[] = ['DEVELOPER', 'DIRECTOR', 'DEPUTY', 'ADMIN'];
export const TEACHING_ROLES: readonly Role[] = ['DEVELOPER', 'DIRECTOR', 'DEPUTY', 'ADMIN', 'TEACHER'];
export const FINANCE_ROLES: readonly Role[] = ['DEVELOPER', 'DIRECTOR', 'DEPUTY', 'ADMIN', 'ACCOUNTANT'];

// ============================================================================
// СТАТУСЫ
// ============================================================================

export type ChildStatus = 'ACTIVE' | 'LEFT' | 'ARCHIVED';
export type ClubEnrollmentStatus = 'ACTIVE' | 'WAITING_LIST' | 'CANCELLED';
export type MaintenanceStatus = 'NEW' | 'IN_PROGRESS' | 'DONE';
export type EmployeeAttendanceStatus = 'PRESENT' | 'SICK_LEAVE' | 'VACATION' | 'ABSENT';
export type LmsStudentStatus = 'active' | 'graduated' | 'transferred';
export type LmsAttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type GradeType = 'regular' | 'test' | 'exam' | 'quarterly';
export type HomeworkStatus = 'active' | 'archived';
export type FeedbackStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED';

// ============================================================================
// ТИПЫ ДАННЫХ
// ============================================================================

export type FinanceType = 'INCOME' | 'EXPENSE';
export type FinanceCategory = 'NUTRITION' | 'CLUBS' | 'MAINTENANCE' | 'SALARY';
export type FinanceSource = 'BUDGET' | 'EXTRA_BUDGET';
export type InventoryType = 'FOOD' | 'SUPPLIES';
export type MaintenanceType = 'REPAIR' | 'PURCHASE';
export type SecurityEventType = 'INCIDENT' | 'FIRE_CHECK' | 'VISITOR_LOG' | 'DOCUMENT';
export type AgeGroup = 'INFANT' | 'PRESCHOOL' | 'ELEMENTARY';

// ============================================================================
// SELECT OPTIONS
// ============================================================================

export interface SelectOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

// ============================================================================
// ФОРМА
// ============================================================================

export interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
}

// ============================================================================
// МОДАЛЬНЫЕ ОКНА
// ============================================================================

export interface ModalState<T = any> {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view' | 'delete';
  data?: T;
}

// ============================================================================
// ТАБЛИЦА
// ============================================================================

export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  width?: string | number;
  sortable?: boolean;
  render?: (row: T, index: number) => React.ReactNode;
}

export interface TableSortState {
  column: string;
  direction: 'asc' | 'desc';
}

// ============================================================================
// ФИЛЬТРЫ
// ============================================================================

export interface FilterState {
  [key: string]: string | number | boolean | string[] | undefined;
}

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

// ============================================================================
// УВЕДОМЛЕНИЯ
// ============================================================================

export interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
  type?: 'success' | 'error' | 'warning' | 'info';
}
