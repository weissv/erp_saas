// src/utils/errors.ts
// Централизованная система обработки ошибок

import { HTTP_STATUS, MESSAGES } from '../constants';

/**
 * Базовый класс для всех ошибок приложения
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    code: string = 'INTERNAL_ERROR',
    details?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;

    // Сохраняем правильный стек вызовов
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    const result: { error: { code: string; message: string; details?: unknown } } = {
      error: {
        code: this.code,
        message: this.message,
      },
    };
    if (this.details !== undefined) {
      result.error.details = this.details;
    }
    return result;
  }
}

/**
 * Ошибка валидации данных
 */
export class ValidationError extends AppError {
  constructor(message: string = MESSAGES.VALIDATION_ERROR, details?: unknown) {
    super(message, HTTP_STATUS.BAD_REQUEST, 'VALIDATION_ERROR', details);
  }
}

/**
 * Ошибка аутентификации
 */
export class AuthenticationError extends AppError {
  constructor(message: string = MESSAGES.UNAUTHORIZED) {
    super(message, HTTP_STATUS.UNAUTHORIZED, 'AUTHENTICATION_ERROR');
  }
}

/**
 * Ошибка авторизации (недостаточно прав)
 */
export class AuthorizationError extends AppError {
  constructor(message: string = MESSAGES.FORBIDDEN) {
    super(message, HTTP_STATUS.FORBIDDEN, 'AUTHORIZATION_ERROR');
  }
}

/**
 * Ошибка - ресурс не найден
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Ресурс') {
    super(`${resource} не найден`, HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
  }
}

/**
 * Ошибка - ресурс уже существует (конфликт)
 */
export class ConflictError extends AppError {
  constructor(message: string = MESSAGES.ALREADY_EXISTS) {
    super(message, HTTP_STATUS.CONFLICT, 'CONFLICT');
  }
}

/**
 * Ошибка базы данных
 */
export class DatabaseError extends AppError {
  constructor(message: string = MESSAGES.DATABASE_ERROR, details?: unknown) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'DATABASE_ERROR', details);
  }
}

/**
 * Ошибка внешнего сервиса
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, message?: string) {
    super(
      message || `Ошибка внешнего сервиса: ${service}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'EXTERNAL_SERVICE_ERROR'
    );
  }
}

/**
 * Бизнес-логика ошибка
 */
export class BusinessError extends AppError {
  constructor(message: string, code: string = 'BUSINESS_ERROR') {
    super(message, HTTP_STATUS.UNPROCESSABLE_ENTITY, code);
  }
}

/**
 * Проверка, является ли ошибка операционной (ожидаемой)
 */
export const isOperationalError = (error: unknown): error is AppError => {
  return error instanceof AppError && error.isOperational;
};

/**
 * Преобразование Prisma ошибок в AppError
 */
export const handlePrismaError = (error: any): AppError => {
  // Prisma известные ошибки
  if (error?.code === 'P2002') {
    const field = error.meta?.target?.[0] || 'поле';
    return new ConflictError(`Запись с таким значением ${field} уже существует`);
  }
  
  if (error?.code === 'P2025') {
    return new NotFoundError('Запись');
  }
  
  if (error?.code === 'P2003') {
    return new ValidationError('Нарушение внешнего ключа. Проверьте связанные записи.');
  }
  
  if (error?.code === 'P2014') {
    return new ValidationError('Операция нарушит требуемое отношение между записями.');
  }

  // Общая ошибка базы данных
  return new DatabaseError(error?.message || "Неизвестная ошибка базы данных");
};

/**
 * Безопасное извлечение сообщения об ошибке
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof AppError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return MESSAGES.SERVER_ERROR;
};

/**
 * Логирование ошибки с контекстом
 */
export const logError = (error: unknown, context?: Record<string, unknown>): void => {
  const timestamp = new Date().toISOString();
  const errorMessage = getErrorMessage(error);
  
  console.error(`[${timestamp}] Error:`, {
    message: errorMessage,
    ...(error instanceof AppError && {
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
    }),
    ...(context && { context }),
    ...(error instanceof Error && { stack: error.stack }),
  });
};
