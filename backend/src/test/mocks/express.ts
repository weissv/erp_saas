// backend/src/test/mocks/express.ts
// Моки для Express запросов и ответов

import { vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

/**
 * Создаёт мок Request объекта Express
 */
export function createMockRequest(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    cookies: {},
    user: undefined,
    get: vi.fn((name: string) => undefined),
    ...overrides,
  };
}

/**
 * Создаёт мок Response объекта Express
 */
export type MockResponse = {
  statusCode: number;
  _json: unknown;
  _headers: Record<string, string>;
  _cookies: Record<string, { value: string; options: object }>;
  status: (code: number) => MockResponse;
  json: (data: unknown) => MockResponse;
  send: (data?: unknown) => MockResponse;
  setHeader: (name: string, value: string) => MockResponse;
  header: (name: string, value: string) => MockResponse;
  cookie: (name: string, value: string, options?: object) => MockResponse;
  clearCookie: (name: string) => MockResponse;
  redirect: (url: string) => MockResponse;
  end: () => MockResponse;
};

export function createMockResponse(): MockResponse {
  const res: any = {
    statusCode: 200,
    _json: null,
    _headers: {},
    _cookies: {},
    
    status: vi.fn(function(code: number) {
      res.statusCode = code;
      return res;
    }),
    
    json: vi.fn(function(data: unknown) {
      res._json = data;
      return res;
    }),
    
    send: vi.fn(function(data?: unknown) {
      res._json = data;
      return res;
    }),
    
    setHeader: vi.fn(function(name: string, value: string) {
      res._headers[name] = value;
      return res;
    }),
    
    header: vi.fn(function(name: string, value: string) {
      res._headers[name] = value;
      return res;
    }),
    
    cookie: vi.fn(function(name: string, value: string, options: object = {}) {
      res._cookies[name] = { value, options };
      return res;
    }),
    
    clearCookie: vi.fn(function(name: string) {
      delete res._cookies[name];
      return res;
    }),
    
    redirect: vi.fn(function(url: string) {
      res._json = { redirectUrl: url };
      return res;
    }),
    
    end: vi.fn(function() {
      return res;
    }),
  };
  
  return res as MockResponse;
}

/**
 * Создаёт мок NextFunction
 */
export function createMockNext(): NextFunction {
  return vi.fn() as unknown as NextFunction;
}

/**
 * Создаёт аутентифицированный запрос
 */
export function createAuthenticatedRequest(
  userId: number = 1,
  role: string = 'admin',
  employeeId: number = 1,
  overrides: Partial<Request> = {}
): Partial<Request> {
  return createMockRequest({
    user: { id: userId, role, employeeId },
    headers: {
      authorization: 'Bearer test-token',
    },
    ...overrides,
  });
}
