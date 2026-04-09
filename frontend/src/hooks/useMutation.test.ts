// src/hooks/useMutation.test.ts
// Unit тесты для useMutation хука

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useMutation } from './useMutation';

// Мок для api модуля
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

vi.mock('../lib/api', () => ({
  api: {
    post: (...args: any[]) => mockPost(...args),
    put: (...args: any[]) => mockPut(...args),
    patch: (...args: any[]) => mockPatch(...args),
    delete: (...args: any[]) => mockDelete(...args),
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
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...args: any[]) => mockToastSuccess(...args),
    error: (...args: any[]) => mockToastError(...args),
  },
}));

describe('useMutation', () => {
  const mockSuccessResponse = { id: 1, name: 'Created Item' };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPost.mockResolvedValue(mockSuccessResponse);
    mockPut.mockResolvedValue(mockSuccessResponse);
    mockPatch.mockResolvedValue(mockSuccessResponse);
    mockDelete.mockResolvedValue({ success: true });
  });

  describe('Состояние по умолчанию', () => {
    it('инициализируется с правильными значениями', () => {
      const { result } = renderHook(() =>
        useMutation({ url: '/api/items' })
      );

      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
    });
  });

  describe('HTTP методы', () => {
    it('использует POST по умолчанию', async () => {
      const { result } = renderHook(() =>
        useMutation({ url: '/api/items' })
      );

      await act(async () => {
        await result.current.mutate({ name: 'New Item' });
      });

      expect(mockPost).toHaveBeenCalledWith('/api/items', { name: 'New Item' });
    });

    it('использует PUT когда указано', async () => {
      const { result } = renderHook(() =>
        useMutation({ url: '/api/items/1', method: 'PUT' })
      );

      await act(async () => {
        await result.current.mutate({ name: 'Updated Item' });
      });

      expect(mockPut).toHaveBeenCalledWith('/api/items/1', { name: 'Updated Item' });
    });

    it('использует PATCH когда указано', async () => {
      const { result } = renderHook(() =>
        useMutation({ url: '/api/items/1', method: 'PATCH' })
      );

      await act(async () => {
        await result.current.mutate({ name: 'Patched' });
      });

      expect(mockPatch).toHaveBeenCalledWith('/api/items/1', { name: 'Patched' });
    });

    it('использует DELETE когда указано', async () => {
      const { result } = renderHook(() =>
        useMutation({ url: '/api/items/1', method: 'DELETE' })
      );

      await act(async () => {
        await result.current.mutate({});
      });

      expect(mockDelete).toHaveBeenCalledWith('/api/items/1');
    });
  });

  describe('Успешные мутации', () => {
    it('обновляет состояние при успехе', async () => {
      const { result } = renderHook(() =>
        useMutation({ url: '/api/items' })
      );

      await act(async () => {
        await result.current.mutate({ name: 'Test' });
      });

      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isError).toBe(false);
      expect(result.current.data).toEqual(mockSuccessResponse);
    });

    it('вызывает onSuccess callback', async () => {
      const onSuccess = vi.fn();

      const { result } = renderHook(() =>
        useMutation({
          url: '/api/items',
          onSuccess,
        })
      );

      await act(async () => {
        await result.current.mutate({ name: 'Test' });
      });

      expect(onSuccess).toHaveBeenCalledWith(
        mockSuccessResponse,
        { name: 'Test' }
      );
    });

    it('показывает toast при успехе когда showSuccessToast=true', async () => {
      const { result } = renderHook(() =>
        useMutation({
          url: '/api/items',
          showSuccessToast: true,
          successMessage: 'Успешно создано!',
        })
      );

      await act(async () => {
        await result.current.mutate({ name: 'Test' });
      });

      expect(mockToastSuccess).toHaveBeenCalledWith('Успешно создано!');
    });
  });

  describe('Неуспешные мутации', () => {
    it('обновляет состояние при ошибке', async () => {
      const error = new Error('Server error');
      mockPost.mockRejectedValue(error);

      const { result } = renderHook(() =>
        useMutation({ url: '/api/items', showErrorToast: false })
      );

      await act(async () => {
        await result.current.mutate({ name: 'Test' });
      });

      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBeDefined();
    });

    it('вызывает onError callback', async () => {
      const error = new Error('Server error');
      mockPost.mockRejectedValue(error);
      const onError = vi.fn();

      const { result } = renderHook(() =>
        useMutation({
          url: '/api/items',
          onError,
          showErrorToast: false,
        })
      );

      await act(async () => {
        await result.current.mutate({ name: 'Test' });
      });

      expect(onError).toHaveBeenCalled();
    });

    it('показывает toast при ошибке когда showErrorToast=true', async () => {
      mockPost.mockRejectedValue(new Error('Failed'));

      const { result } = renderHook(() =>
        useMutation({
          url: '/api/items',
          showErrorToast: true,
          errorMessage: 'Ошибка создания!',
        })
      );

      await act(async () => {
        await result.current.mutate({ name: 'Test' });
      });

      expect(mockToastError).toHaveBeenCalled();
    });
  });

  describe('onSettled callback', () => {
    it('вызывается при успехе', async () => {
      const onSettled = vi.fn();

      const { result } = renderHook(() =>
        useMutation({ url: '/api/items', onSettled })
      );

      await act(async () => {
        await result.current.mutate({ name: 'Test' });
      });

      expect(onSettled).toHaveBeenCalledWith(
        mockSuccessResponse,
        undefined,
        { name: 'Test' }
      );
    });

    it('вызывается при ошибке', async () => {
      mockPost.mockRejectedValue(new Error('Failed'));
      const onSettled = vi.fn();

      const { result } = renderHook(() =>
        useMutation({ url: '/api/items', onSettled, showErrorToast: false })
      );

      await act(async () => {
        await result.current.mutate({ name: 'Test' });
      });

      expect(onSettled).toHaveBeenCalledWith(
        undefined,
        expect.any(Error),
        { name: 'Test' }
      );
    });
  });

  describe('transformVariables', () => {
    it('трансформирует данные перед отправкой', async () => {
      const transformVariables = vi.fn((vars: any) => ({
        ...vars,
        transformed: true,
      }));

      const { result } = renderHook(() =>
        useMutation({
          url: '/api/items',
          transformVariables,
        })
      );

      await act(async () => {
        await result.current.mutate({ name: 'Test' });
      });

      expect(mockPost).toHaveBeenCalledWith('/api/items', {
        name: 'Test',
        transformed: true,
      });
    });
  });

  describe('mutateAsync', () => {
    it('возвращает Promise с данными', async () => {
      const { result } = renderHook(() =>
        useMutation({ url: '/api/items' })
      );

      let response: any;
      await act(async () => {
        response = await result.current.mutateAsync({ name: 'Test' });
      });

      expect(response).toEqual(mockSuccessResponse);
    });

    it('выбрасывает ошибку при неудаче', async () => {
      mockPost.mockRejectedValue(new Error('Failed'));

      const { result } = renderHook(() =>
        useMutation({ url: '/api/items', showErrorToast: false })
      );

      await expect(
        act(async () => {
          await result.current.mutateAsync({ name: 'Test' });
        })
      ).rejects.toThrow();
    });
  });

  describe('reset', () => {
    it('сбрасывает состояние', async () => {
      const { result } = renderHook(() =>
        useMutation({ url: '/api/items' })
      );

      await act(async () => {
        await result.current.mutate({ name: 'Test' });
      });

      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data).toBeDefined();

      act(() => {
        result.current.reset();
      });

      expect(result.current.isSuccess).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
    });
  });

  describe('isLoading состояние', () => {
    it('устанавливает isLoading во время запроса', async () => {
      let resolvePromise: (value: any) => void;
      mockPost.mockImplementation(
        () => new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      const { result } = renderHook(() =>
        useMutation({ url: '/api/items' })
      );

      act(() => {
        result.current.mutate({ name: 'Test' });
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!(mockSuccessResponse);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });
});
