// backend/src/utils/response.test.ts
// Unit тесты для стандартизированных ответов API

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiResponse, sendSuccess, sendCreated, sendDeleted, sendList } from './response';
import { createMockResponse } from '../test/mocks/express';
import { HTTP_STATUS } from '../constants';

describe('ApiResponse', () => {
  describe('success', () => {
    it('возвращает успешный ответ с данными', () => {
      const res = createMockResponse();
      const data = { id: 1, name: 'Test' };

      ApiResponse.success(res as any, data);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data,
      });
    });

    it('позволяет передать кастомный статус код', () => {
      const res = createMockResponse();

      ApiResponse.success(res as any, {}, 201);

      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('created', () => {
    it('возвращает ответ с статусом 201', () => {
      const res = createMockResponse();
      const data = { id: 1 };

      ApiResponse.created(res as any, data);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.CREATED);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data,
      }));
    });

    it('включает сообщение в ответ', () => {
      const res = createMockResponse();

      ApiResponse.created(res as any, {}, 'Создано успешно');

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Создано успешно',
      }));
    });
  });

  describe('updated', () => {
    it('возвращает ответ с обновлёнными данными', () => {
      const res = createMockResponse();
      const data = { id: 1, name: 'Updated' };

      ApiResponse.updated(res as any, data);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data,
      }));
    });
  });

  describe('deleted', () => {
    it('возвращает 204 No Content', () => {
      const res = createMockResponse();

      ApiResponse.deleted(res as any);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.NO_CONTENT);
      expect(res.send).toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('возвращает список с пагинацией', () => {
      const res = createMockResponse();
      const items = [{ id: 1 }, { id: 2 }];

      ApiResponse.list(res as any, items, 100, 1, 10);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          items,
          total: 100,
          page: 1,
          pageSize: 10,
          totalPages: 10,
        },
      });
    });

    it('правильно вычисляет totalPages', () => {
      const res = createMockResponse();

      ApiResponse.list(res as any, [], 95, 1, 10);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          totalPages: 10, // Math.ceil(95/10) = 10
        }),
      }));
    });

    it('обрабатывает пустой список', () => {
      const res = createMockResponse();

      ApiResponse.list(res as any, [], 0, 1, 10);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          items: [],
          total: 0,
          totalPages: 0,
        }),
      }));
    });
  });

  describe('legacyList', () => {
    it('возвращает список в legacy формате', () => {
      const res = createMockResponse();
      const items = [{ id: 1 }];

      ApiResponse.legacyList(res as any, items, 50);

      expect(res.json).toHaveBeenCalledWith({
        items,
        total: 50,
      });
    });
  });

  describe('error', () => {
    it('возвращает ошибку с правильной структурой', () => {
      const res = createMockResponse();

      ApiResponse.error(res as any, 400, 'TEST_ERROR', 'Test message');

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'TEST_ERROR',
          message: 'Test message',
        },
      });
    });

    it('включает детали в ошибку', () => {
      const res = createMockResponse();
      const details = { field: 'email', reason: 'invalid' };

      ApiResponse.error(res as any, 400, 'TEST_ERROR', 'Test message', details);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'TEST_ERROR',
          message: 'Test message',
          details,
        },
      });
    });
  });

  describe('validationError', () => {
    it('возвращает ошибку валидации', () => {
      const res = createMockResponse();
      const details = { field: 'email' };

      ApiResponse.validationError(res as any, details);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          details,
        }),
      }));
    });
  });

  describe('unauthorized', () => {
    it('возвращает 401 ошибку', () => {
      const res = createMockResponse();

      ApiResponse.unauthorized(res as any);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'UNAUTHORIZED',
        }),
      }));
    });

    it('принимает кастомное сообщение', () => {
      const res = createMockResponse();

      ApiResponse.unauthorized(res as any, 'Token expired');

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          message: 'Token expired',
        }),
      }));
    });
  });

  describe('forbidden', () => {
    it('возвращает 403 ошибку', () => {
      const res = createMockResponse();

      ApiResponse.forbidden(res as any);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.FORBIDDEN);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          code: 'FORBIDDEN',
        }),
      }));
    });
  });

  describe('notFound', () => {
    it('возвращает 404 ошибку', () => {
      const res = createMockResponse();

      ApiResponse.notFound(res as any);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.NOT_FOUND);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          code: 'NOT_FOUND',
        }),
      }));
    });

    it('включает имя ресурса в сообщение', () => {
      const res = createMockResponse();

      ApiResponse.notFound(res as any, 'Пользователь');

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          message: expect.stringContaining('Пользователь'),
        }),
      }));
    });
  });

  describe('conflict', () => {
    it('возвращает 409 ошибку', () => {
      const res = createMockResponse();

      ApiResponse.conflict(res as any);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.CONFLICT);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          code: 'CONFLICT',
        }),
      }));
    });
  });

  describe('serverError', () => {
    it('возвращает 500 ошибку', () => {
      const res = createMockResponse();

      ApiResponse.serverError(res as any);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          code: 'INTERNAL_ERROR',
        }),
      }));
    });
  });
});

describe('Хелперы ответов', () => {
  it('sendSuccess вызывает ApiResponse.success', () => {
    const res = createMockResponse();
    const data = { id: 1 };

    sendSuccess(res as any, data);

    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
  });

  it('sendCreated вызывает ApiResponse.created', () => {
    const res = createMockResponse();

    sendCreated(res as any, { id: 1 });

    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.CREATED);
  });

  it('sendDeleted вызывает ApiResponse.deleted', () => {
    const res = createMockResponse();

    sendDeleted(res as any);

    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.NO_CONTENT);
  });

  it('sendList вызывает ApiResponse.list', () => {
    const res = createMockResponse();

    sendList(res as any, [], 0, 1, 10);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        items: [],
        total: 0,
      }),
    }));
  });
});
