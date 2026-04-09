// backend/src/middleware/auth.test.ts
// Unit тесты для middleware аутентификации

import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { authMiddleware, AuthUser } from './auth';
import { createMockRequest, createMockResponse, createMockNext } from '../test/mocks/express';

// Мок для конфига
vi.mock('../config', () => ({
  config: {
    jwtSecret: 'test-secret',
  },
}));

describe('authMiddleware', () => {
  const validPayload: AuthUser = {
    id: 1,
    role: 'admin',
    employeeId: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('OPTIONS запросы', () => {
    it('пропускает preflight запросы', () => {
      const req = createMockRequest({ method: 'OPTIONS' });
      const res = createMockResponse();
      const next = createMockNext();

      authMiddleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('Токен в cookie', () => {
    it('извлекает токен из auth_token cookie', () => {
      const token = jwt.sign(validPayload, 'test-secret');
      const req = createMockRequest({
        cookies: { auth_token: token },
      });
      const res = createMockResponse();
      const next = createMockNext();

      authMiddleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toMatchObject(validPayload);
    });
  });

  describe('Токен в Authorization header', () => {
    it('извлекает токен из Bearer header', () => {
      const token = jwt.sign(validPayload, 'test-secret');
      const req = createMockRequest({
        headers: {
          authorization: `Bearer ${token}`,
        },
        cookies: {},
      });
      const res = createMockResponse();
      const next = createMockNext();

      authMiddleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toMatchObject(validPayload);
    });

    it('приоритет cookie над header', () => {
      const cookieToken = jwt.sign({ ...validPayload, id: 1 }, 'test-secret');
      const headerToken = jwt.sign({ ...validPayload, id: 2 }, 'test-secret');
      const req = createMockRequest({
        cookies: { auth_token: cookieToken },
        headers: {
          authorization: `Bearer ${headerToken}`,
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      authMiddleware(req as any, res as any, next);

      expect(req.user?.id).toBe(1); // cookie user
    });
  });

  describe('Без токена', () => {
    it('возвращает 401 если токен отсутствует', () => {
      const req = createMockRequest({
        cookies: {},
        headers: {},
      });
      const res = createMockResponse();
      const next = createMockNext();

      authMiddleware(req as any, res as any, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
    });

    it('возвращает 401 для пустого Authorization header', () => {
      const req = createMockRequest({
        cookies: {},
        headers: { authorization: '' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      authMiddleware(req as any, res as any, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('возвращает 401 для Authorization header без Bearer', () => {
      const req = createMockRequest({
        cookies: {},
        headers: { authorization: 'Basic sometoken' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      authMiddleware(req as any, res as any, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('Невалидный токен', () => {
    it('возвращает 401 для просроченного токена', () => {
      const expiredToken = jwt.sign(
        validPayload,
        'test-secret',
        { expiresIn: '-1s' }
      );
      const req = createMockRequest({
        cookies: { auth_token: expiredToken },
      });
      const res = createMockResponse();
      const next = createMockNext();

      authMiddleware(req as any, res as any, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
      expect(next).not.toHaveBeenCalled();
    });

    it('возвращает 401 для токена с неверной подписью', () => {
      const wrongSecretToken = jwt.sign(validPayload, 'wrong-secret');
      const req = createMockRequest({
        cookies: { auth_token: wrongSecretToken },
      });
      const res = createMockResponse();
      const next = createMockNext();

      authMiddleware(req as any, res as any, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
    });

    it('возвращает 401 для malformed токена', () => {
      const req = createMockRequest({
        cookies: { auth_token: 'not.a.valid.jwt.token' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      authMiddleware(req as any, res as any, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('Валидный токен', () => {
    it('добавляет user в request', () => {
      const token = jwt.sign(validPayload, 'test-secret');
      const req = createMockRequest({
        cookies: { auth_token: token },
      });
      const res = createMockResponse();
      const next = createMockNext();

      authMiddleware(req as any, res as any, next);

      expect(req.user).toBeDefined();
      expect(req.user?.id).toBe(validPayload.id);
      expect(req.user?.role).toBe(validPayload.role);
      expect(req.user?.employeeId).toBe(validPayload.employeeId);
    });

    it('вызывает next() для продолжения', () => {
      const token = jwt.sign(validPayload, 'test-secret');
      const req = createMockRequest({
        cookies: { auth_token: token },
      });
      const res = createMockResponse();
      const next = createMockNext();

      authMiddleware(req as any, res as any, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });
  });
});
