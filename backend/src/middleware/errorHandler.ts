// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { 
  AppError, 
  ValidationError,
  isOperationalError, 
  handlePrismaError, 
  logError 
} from "../utils/errors";
import { HTTP_STATUS, MESSAGES } from "../constants";

/**
 * Глобальный обработчик ошибок
 * Централизованная обработка всех ошибок приложения
 */
export const errorHandler = (
  err: unknown, 
  req: Request, 
  res: Response, 
  _next: NextFunction
) => {
  // Логируем ошибку с контекстом запроса
  logError(err, {
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    body: req.method !== 'GET' ? req.body : undefined,
  });

  // Обработка Zod ошибок валидации
  if (err instanceof ZodError) {
    const validationError = new ValidationError(
      MESSAGES.VALIDATION_ERROR,
      err.flatten().fieldErrors
    );
    return res.status(validationError.statusCode).json(validationError.toJSON());
  }

  // Обработка операционных ошибок приложения
  if (isOperationalError(err)) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  // Обработка Prisma ошибок
  if ((err as any)?.code?.startsWith?.('P')) {
    const prismaError = handlePrismaError(err);
    return res.status(prismaError.statusCode).json(prismaError.toJSON());
  }

  // Обработка JWT ошибок
  if ((err as any)?.name === 'JsonWebTokenError') {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Недействительный токен авторизации',
      },
    });
  }

  if ((err as any)?.name === 'TokenExpiredError') {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: {
        code: 'TOKEN_EXPIRED',
        message: MESSAGES.TOKEN_EXPIRED,
      },
    });
  }

  // Старый формат для обратной совместимости
  if ((err as any)?.status && (err as any)?.message) {
    return res.status((err as any).status).json({ message: (err as any).message });
  }

  // Необработанная ошибка - скрываем детали в production
  const isProduction = process.env.NODE_ENV === 'production';
  
  return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: isProduction ? MESSAGES.SERVER_ERROR : (err as Error)?.message || MESSAGES.SERVER_ERROR,
      ...(!isProduction && { stack: (err as Error)?.stack }),
    },
  });
};

/**
 * Обработчик для необработанных маршрутов (404)
 */
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    error: {
      code: 'NOT_FOUND',
      message: `Маршрут ${req.method} ${req.path} не найден`,
    },
  });
};

/**
 * Async wrapper для автоматической обработки ошибок в async route handlers
 */
export const asyncHandler = <T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: T, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
