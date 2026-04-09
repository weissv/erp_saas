// src/services/BaseService.ts
// Базовый сервис с общей логикой для всех сервисов

import { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { PAGINATION } from '../constants';
import { NotFoundError, ValidationError, handlePrismaError } from '../utils/errors';

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Базовый сервис с общими CRUD операциями
 * @template T - Тип модели
 * @template CreateInput - Тип данных для создания
 * @template UpdateInput - Тип данных для обновления
 */
export abstract class BaseService<
  T,
  CreateInput = Partial<T>,
  UpdateInput = Partial<T>
> {
  protected prisma = prisma;
  
  /**
   * Получить название модели для сообщений об ошибках
   */
  protected abstract get modelName(): string;

  /**
   * Получить разрешённые поля для сортировки
   */
  protected abstract get allowedSortFields(): string[];

  /**
   * Построить параметры пагинации
   */
  protected buildPagination(params: PaginationParams) {
    const page = Math.max(params.page || PAGINATION.DEFAULT_PAGE, 1);
    const pageSize = Math.min(
      Math.max(params.pageSize || PAGINATION.DEFAULT_PAGE_SIZE, PAGINATION.MIN_PAGE_SIZE),
      PAGINATION.MAX_PAGE_SIZE
    );
    const skip = (page - 1) * pageSize;
    
    return { page, pageSize, skip, take: pageSize };
  }

  /**
   * Построить параметры сортировки
   */
  protected buildOrderBy(params: SortParams): Record<string, 'asc' | 'desc'> {
    const { sortBy, sortOrder = 'asc' } = params;
    
    if (sortBy && this.allowedSortFields.includes(sortBy)) {
      return { [sortBy]: sortOrder };
    }
    
    // По умолчанию сортируем по первому разрешённому полю
    return { [this.allowedSortFields[0] || 'id']: sortOrder };
  }

  /**
   * Форматировать результат пагинации
   */
  protected formatPaginatedResult<R>(
    items: R[],
    total: number,
    pagination: ReturnType<typeof this.buildPagination>
  ): PaginatedResult<R> {
    return {
      items,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(total / pagination.pageSize),
    };
  }

  /**
   * Безопасный запрос с обработкой ошибок Prisma
   */
  protected async safeQuery<R>(query: () => Promise<R>): Promise<R> {
    try {
      return await query();
    } catch (error) {
      throw handlePrismaError(error);
    }
  }

  /**
   * Проверить существование записи
   */
  protected async ensureExists<Model extends { id: number | string }>(
    model: { findUnique: (args: any) => Promise<Model | null> },
    id: number | string,
    resourceName?: string
  ): Promise<Model> {
    const record = await model.findUnique({ where: { id } });
    
    if (!record) {
      throw new NotFoundError(resourceName || this.modelName);
    }
    
    return record;
  }

  /**
   * Валидация числового ID
   */
  protected validateNumericId(id: string | number, fieldName: string = 'ID'): number {
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    
    if (isNaN(numericId) || numericId < 1) {
      throw new ValidationError(`Неверный ${fieldName}: ${id}`);
    }
    
    return numericId;
  }

  /**
   * Преобразование строки в дату с валидацией
   */
  protected parseDate(value: string | Date, fieldName: string = 'дата'): Date {
    const date = value instanceof Date ? value : new Date(value);
    
    if (isNaN(date.getTime())) {
      throw new ValidationError(`Неверный формат ${fieldName}: ${value}`);
    }
    
    return date;
  }
}
