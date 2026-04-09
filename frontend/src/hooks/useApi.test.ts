// src/hooks/useApi.test.ts
// Unit тесты для useApi хука

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useApi } from './useApi';

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

describe('useApi', () => {
  const mockResponse = {
    items: [
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' },
    ],
    total: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue(mockResponse);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Начальная загрузка', () => {
    it('загружает данные при монтировании когда autoFetch=true', async () => {
      const { result } = renderHook(() =>
        useApi({ url: '/api/items', autoFetch: true })
      );

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.data).toEqual(mockResponse.items);
        expect(result.current.total).toBe(2);
      });

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('/api/items'));
    });

    it('не загружает данные при монтировании когда autoFetch=false', async () => {
      const { result } = renderHook(() =>
        useApi({ url: '/api/items', autoFetch: false })
      );

      expect(result.current.loading).toBe(false);
      expect(result.current.data).toEqual([]);
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('не загружает данные когда enabled=false', async () => {
      const { result } = renderHook(() =>
        useApi({ url: '/api/items', enabled: false })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGet).not.toHaveBeenCalled();
    });
  });

  describe('Пагинация', () => {
    it('отправляет параметры пагинации в запросе', async () => {
      renderHook(() =>
        useApi({ url: '/api/items', initialPage: 2, initialPageSize: 20 })
      );

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith(
          expect.stringContaining('page=2')
        );
        expect(mockGet).toHaveBeenCalledWith(
          expect.stringContaining('pageSize=20')
        );
      });
    });

    it('обновляет страницу через setPage', async () => {
      const { result } = renderHook(() => useApi({ url: '/api/items' }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setPage(3);
      });

      expect(result.current.page).toBe(3);

      await waitFor(() => {
        expect(mockGet).toHaveBeenLastCalledWith(
          expect.stringContaining('page=3')
        );
      });
    });

    it('рассчитывает totalPages корректно', async () => {
      mockGet.mockResolvedValue({ items: [], total: 100 });

      const { result } = renderHook(() =>
        useApi({ url: '/api/items', initialPageSize: 10 })
      );

      await waitFor(() => {
        expect(result.current.totalPages).toBe(10);
      });
    });
  });

  describe('Поиск', () => {
    it('обновляет поисковый запрос через setSearch', async () => {
      const { result } = renderHook(() =>
        useApi({
          url: '/api/items',
          searchFields: ['name' as keyof any],
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setSearch('test query');
      });

      expect(result.current.search).toBe('test query');

      await waitFor(() => {
        expect(mockGet).toHaveBeenLastCalledWith(
          expect.stringContaining('name=test')
        );
      });
    });
  });

  describe('Фильтры', () => {
    it('обновляет фильтры через setFilters', async () => {
      const { result } = renderHook(() => useApi({ url: '/api/items' }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setFilters({ status: 'active', category: 'books' });
      });

      await waitFor(() => {
        const lastCall = mockGet.mock.calls[mockGet.mock.calls.length - 1][0];
        expect(lastCall).toContain('status=active');
        expect(lastCall).toContain('category=books');
      });
    });

    it('игнорирует пустые значения фильтров', async () => {
      const { result } = renderHook(() =>
        useApi({ url: '/api/items', filters: { status: '', empty: null } })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const lastCall = mockGet.mock.calls[mockGet.mock.calls.length - 1][0];
      expect(lastCall).not.toContain('status=');
      expect(lastCall).not.toContain('empty=');
    });
  });

  describe('Сортировка', () => {
    it('добавляет параметры сортировки в запрос', async () => {
      renderHook(() =>
        useApi({
          url: '/api/items',
          sortBy: 'createdAt',
          sortOrder: 'desc',
        })
      );

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith(
          expect.stringContaining('sortBy=createdAt')
        );
        expect(mockGet).toHaveBeenCalledWith(
          expect.stringContaining('sortOrder=desc')
        );
      });
    });
  });

  describe('Обработка ответов', () => {
    it('обрабатывает ответ с items массивом', async () => {
      mockGet.mockResolvedValue({ items: [{ id: 1 }], total: 1 });

      const { result } = renderHook(() => useApi({ url: '/api/items' }));

      await waitFor(() => {
        expect(result.current.data).toEqual([{ id: 1 }]);
        expect(result.current.total).toBe(1);
      });
    });

    it('обрабатывает ответ с data.items массивом', async () => {
      mockGet.mockResolvedValue({ data: { items: [{ id: 2 }], total: 5 } });

      const { result } = renderHook(() => useApi({ url: '/api/items' }));

      await waitFor(() => {
        expect(result.current.data).toEqual([{ id: 2 }]);
        expect(result.current.total).toBe(5);
      });
    });

    it('обрабатывает ответ с простым массивом', async () => {
      mockGet.mockResolvedValue([{ id: 3 }, { id: 4 }]);

      const { result } = renderHook(() => useApi({ url: '/api/items' }));

      await waitFor(() => {
        expect(result.current.data).toEqual([{ id: 3 }, { id: 4 }]);
        expect(result.current.total).toBe(2);
      });
    });
  });

  describe('Обработка ошибок', () => {
    it('устанавливает error при неудачном запросе', async () => {
      const error = new Error('Network error');
      mockGet.mockRejectedValue(error);

      const { result } = renderHook(() =>
        useApi({ url: '/api/items', showErrorToast: false })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeDefined();
        expect(result.current.data).toEqual([]);
      });
    });
  });

  describe('Методы refresh и fetchData', () => {
    it('повторно загружает данные при вызове refresh', async () => {
      const { result } = renderHook(() => useApi({ url: '/api/items' }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGet).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockGet).toHaveBeenCalledTimes(2);
    });

    it('fetchData загружает данные', async () => {
      const { result } = renderHook(() =>
        useApi({ url: '/api/items', autoFetch: false })
      );

      expect(mockGet).not.toHaveBeenCalled();

      await act(async () => {
        await result.current.fetchData();
      });

      expect(mockGet).toHaveBeenCalledTimes(1);
    });
  });
});
