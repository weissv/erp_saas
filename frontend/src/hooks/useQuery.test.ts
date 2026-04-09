// src/hooks/useQuery.test.ts
// Unit тесты для useQuery хука

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useQuery } from './useQuery';

// Мок для api модуля
const mockGet = vi.fn();

vi.mock('../lib/api', () => ({
  api: {
    get: (...args: any[]) => mockGet(...args),
  },
  ApiRequestError: class extends Error {
    statusCode: number;
    code: string;
    constructor(message: string, statusCode: number, code = 'API_ERROR') {
      super(message);
      this.statusCode = statusCode;
      this.code = code;
      this.name = 'ApiRequestError';
    }
  },
  getApiErrorMessage: (err: any) => err?.message || 'Unknown error',
}));

// Мок для sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('useQuery', () => {
  const mockData = { id: 1, name: 'Test Item' };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockGet.mockResolvedValue(mockData);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Начальное состояние', () => {
    it('инициализируется с правильными значениями по умолчанию', () => {
      mockGet.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() =>
        useQuery({ url: '/api/item' })
      );

      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeUndefined();
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isFetching).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
    });

    it('использует initialData когда предоставлено', () => {
      const initialData = { id: 0, name: 'Initial' };
      mockGet.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() =>
        useQuery({ url: '/api/item', initialData })
      );

      expect(result.current.data).toEqual(initialData);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(true);
    });
  });

  describe('Загрузка данных', () => {
    it('загружает данные при enabled=true', async () => {
      const { result } = renderHook(() =>
        useQuery({ url: '/api/item', enabled: true })
      );

      await vi.runAllTimersAsync();

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData);
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('не загружает данные при enabled=false', async () => {
      const { result } = renderHook(() =>
        useQuery({ url: '/api/item', enabled: false })
      );

      await vi.runAllTimersAsync();

      expect(mockGet).not.toHaveBeenCalled();
      expect(result.current.data).toBeUndefined();
    });

    it('передаёт параметры в запрос', async () => {
      renderHook(() =>
        useQuery({
          url: '/api/item',
          params: { filter: 'active', page: 1 },
        })
      );

      await vi.runAllTimersAsync();

      expect(mockGet).toHaveBeenCalledWith(
        '/api/item',
        { filter: 'active', page: 1 }
      );
    });
  });

  describe('Обработка ошибок', () => {
    it('устанавливает error при неудачном запросе', async () => {
      const error = new Error('Network error');
      mockGet.mockRejectedValue(error);

      const { result } = renderHook(() =>
        useQuery({ url: '/api/item' })
      );

      await vi.runAllTimersAsync();

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toBeDefined();
        expect(result.current.isSuccess).toBe(false);
      });
    });

    it('вызывает onError callback при ошибке', async () => {
      const error = new Error('Failed');
      mockGet.mockRejectedValue(error);
      const onError = vi.fn();

      renderHook(() =>
        useQuery({ url: '/api/item', onError })
      );

      await vi.runAllTimersAsync();

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });
  });

  describe('Callbacks', () => {
    it('вызывает onSuccess callback при успехе', async () => {
      const onSuccess = vi.fn();

      renderHook(() =>
        useQuery({ url: '/api/item', onSuccess })
      );

      await vi.runAllTimersAsync();

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(mockData);
      });
    });
  });

  describe('Трансформация данных', () => {
    it('применяет select функцию к данным', async () => {
      const select = vi.fn((data) => ({ ...data, transformed: true }));

      const { result } = renderHook(() =>
        useQuery({ url: '/api/item', select })
      );

      await vi.runAllTimersAsync();

      await waitFor(() => {
        expect(result.current.data).toEqual({
          ...mockData,
          transformed: true,
        });
      });
    });
  });

  describe('refetch', () => {
    it('повторно загружает данные', async () => {
      const { result } = renderHook(() =>
        useQuery({ url: '/api/item' })
      );

      await vi.runAllTimersAsync();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockGet).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockGet).toHaveBeenCalledTimes(2);
    });
  });

  describe('reset', () => {
    it('сбрасывает состояние', async () => {
      const { result } = renderHook(() =>
        useQuery({ url: '/api/item' })
      );

      await vi.runAllTimersAsync();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeUndefined();
      expect(result.current.isSuccess).toBe(false);
    });
  });

  describe('staleTime', () => {
    it('не перезагружает данные пока staleTime не истёк', async () => {
      const { result } = renderHook(() =>
        useQuery({ url: '/api/item', staleTime: 5000 })
      );

      await vi.runAllTimersAsync();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Первый вызов
      expect(mockGet).toHaveBeenCalledTimes(1);

      // Пытаемся refetch до истечения staleTime
      await act(async () => {
        await result.current.refetch();
      });

      // Не должно быть нового вызова
      expect(mockGet).toHaveBeenCalledTimes(1);

      // Перематываем время
      vi.advanceTimersByTime(5001);

      // Теперь refetch должен сработать
      await act(async () => {
        await result.current.refetch();
      });

      expect(mockGet).toHaveBeenCalledTimes(2);
    });
  });

  describe('Изменение параметров', () => {
    it('перезагружает данные при изменении params', async () => {
      const { result, rerender } = renderHook(
        (props) => useQuery(props),
        {
          initialProps: {
            url: '/api/item',
            params: { filter: 'all' },
          },
        }
      );

      await vi.runAllTimersAsync();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockGet).toHaveBeenCalledTimes(1);

      rerender({
        url: '/api/item',
        params: { filter: 'active' },
      });

      await vi.runAllTimersAsync();

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledTimes(2);
      });
    });
  });
});
