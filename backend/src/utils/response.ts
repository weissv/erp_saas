// src/utils/response.ts
// Стандартизированные ответы API

import { Response } from 'express';
import { HTTP_STATUS, MESSAGES } from '../constants';

/**
 * Интерфейс стандартного успешного ответа
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Интерфейс стандартного ответа со списком
 */
export interface ApiListResponse<T> {
  success: true;
  data: {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

/**
 * Интерфейс стандартного ответа с ошибкой
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Класс для формирования стандартизированных ответов API
 */
export class ApiResponse {
  /**
   * Успешный ответ с данными
   */
  static success<T>(res: Response, data: T, statusCode: number = HTTP_STATUS.OK): Response {
    return res.status(statusCode).json({
      success: true,
      data,
    } as ApiSuccessResponse<T>);
  }

  /**
   * Успешный ответ создания
   */
  static created<T>(res: Response, data: T, message?: string): Response {
    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data,
      message: message || MESSAGES.CREATED,
    } as ApiSuccessResponse<T>);
  }

  /**
   * Успешный ответ обновления
   */
  static updated<T>(res: Response, data: T, message?: string): Response {
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data,
      message: message || MESSAGES.UPDATED,
    } as ApiSuccessResponse<T>);
  }

  /**
   * Успешный ответ удаления (без контента)
   */
  static deleted(res: Response): Response {
    return res.status(HTTP_STATUS.NO_CONTENT).send();
  }

  /**
   * Ответ со списком и пагинацией
   */
  static list<T>(
    res: Response,
    items: T[],
    total: number,
    page: number,
    pageSize: number
  ): Response {
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    } as ApiListResponse<T>);
  }

  /**
   * Ответ со списком (простой формат для обратной совместимости)
   */
  static legacyList<T>(res: Response, items: T[], total: number): Response {
    return res.status(HTTP_STATUS.OK).json({ items, total });
  }

  /**
   * Ответ с ошибкой
   */
  static error(
    res: Response,
    statusCode: number,
    code: string,
    message: string,
    details?: unknown
  ): Response {
    const errorBody: ApiErrorResponse = {
      success: false,
      error: {
        code,
        message,
      },
    };
    if (details !== undefined) {
      errorBody.error.details = details;
    }
    return res.status(statusCode).json(errorBody);
  }

  /**
   * Ошибка валидации
   */
  static validationError(res: Response, details: unknown): Response {
    return this.error(
      res,
      HTTP_STATUS.BAD_REQUEST,
      'VALIDATION_ERROR',
      MESSAGES.VALIDATION_ERROR,
      details
    );
  }

  /**
   * Ошибка авторизации
   */
  static unauthorized(res: Response, message?: string): Response {
    return this.error(
      res,
      HTTP_STATUS.UNAUTHORIZED,
      'UNAUTHORIZED',
      message || MESSAGES.UNAUTHORIZED
    );
  }

  /**
   * Ошибка доступа
   */
  static forbidden(res: Response, message?: string): Response {
    return this.error(
      res,
      HTTP_STATUS.FORBIDDEN,
      'FORBIDDEN',
      message || MESSAGES.FORBIDDEN
    );
  }

  /**
   * Ресурс не найден
   */
  static notFound(res: Response, resource?: string): Response {
    return this.error(
      res,
      HTTP_STATUS.NOT_FOUND,
      'NOT_FOUND',
      resource ? `${resource} не найден` : MESSAGES.NOT_FOUND
    );
  }

  /**
   * Конфликт (ресурс уже существует)
   */
  static conflict(res: Response, message?: string): Response {
    return this.error(
      res,
      HTTP_STATUS.CONFLICT,
      'CONFLICT',
      message || MESSAGES.ALREADY_EXISTS
    );
  }

  /**
   * Внутренняя ошибка сервера
   */
  static serverError(res: Response, message?: string): Response {
    return this.error(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'INTERNAL_ERROR',
      message || MESSAGES.SERVER_ERROR
    );
  }
}

/**
 * Хелперы для быстрого создания ответов
 */
export const sendSuccess = <T>(res: Response, data: T) => ApiResponse.success(res, data);
export const sendCreated = <T>(res: Response, data: T) => ApiResponse.created(res, data);
export const sendDeleted = (res: Response) => ApiResponse.deleted(res);
export const sendList = <T>(res: Response, items: T[], total: number, page: number, pageSize: number) => 
  ApiResponse.list(res, items, total, page, pageSize);
