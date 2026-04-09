// src/hooks/lms/useLmsSubjects.test.ts
// Unit тесты для useLmsSubjects хука

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useLmsSubjects } from './useLmsSubjects';

// Мок для lmsApi
const mockGetSubjects = vi.fn();

vi.mock('../../lib/lms-api', () => ({
  lmsApi: {
    getSubjects: (...args: any[]) => mockGetSubjects(...args),
  },
}));

describe('useLmsSubjects', () => {
  const mockSubjectsData = [
    { id: 1, name: 'Математика', description: 'Основы математики', grade: 1, hoursPerWeek: 5 },
    { id: 2, name: 'Русский язык', description: 'Грамматика и письмо', grade: 1, hoursPerWeek: 5 },
    { id: 3, name: 'Литературное чтение', description: 'Чтение и анализ текстов', grade: 1, hoursPerWeek: 4 },
    { id: 4, name: 'Окружающий мир', description: 'Познание мира', grade: 1, hoursPerWeek: 2 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSubjects.mockResolvedValue(mockSubjectsData);
  });

  describe('Инициализация', () => {
    it('начинает с loading = true', () => {
      mockGetSubjects.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      const { result } = renderHook(() => useLmsSubjects());

      expect(result.current.loading).toBe(true);
      expect(result.current.subjects).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Загрузка данных', () => {
    it('загружает список предметов при монтировании', async () => {
      const { result } = renderHook(() => useLmsSubjects());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.subjects).toEqual(mockSubjectsData);
      });

      expect(mockGetSubjects).toHaveBeenCalledTimes(1);
    });

    it('устанавливает loading = false после загрузки', async () => {
      const { result } = renderHook(() => useLmsSubjects());

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('Обработка ошибок', () => {
    it('устанавливает error при неудачном запросе', async () => {
      const error = new Error('Network error');
      mockGetSubjects.mockRejectedValue(error);

      const { result } = renderHook(() => useLmsSubjects());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe(error);
      });
    });

    it('сохраняет пустой массив subjects при ошибке', async () => {
      mockGetSubjects.mockRejectedValue(new Error('Failed'));

      const { result } = renderHook(() => useLmsSubjects());

      await waitFor(() => {
        expect(result.current.subjects).toEqual([]);
      });
    });
  });

  describe('refetch', () => {
    it('повторно загружает данные', async () => {
      const { result } = renderHook(() => useLmsSubjects());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetSubjects).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockGetSubjects).toHaveBeenCalledTimes(2);
    });

    it('обновляет данные после refetch', async () => {
      const updatedData = [
        ...mockSubjectsData,
        { id: 5, name: 'Физкультура', description: 'Физическое развитие', grade: 1, hoursPerWeek: 3 },
      ];

      mockGetSubjects
        .mockResolvedValueOnce(mockSubjectsData)
        .mockResolvedValueOnce(updatedData);

      const { result } = renderHook(() => useLmsSubjects());

      await waitFor(() => {
        expect(result.current.subjects).toHaveLength(4);
      });

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.subjects).toHaveLength(5);
      });
    });

    it('сбрасывает error перед новым запросом', async () => {
      mockGetSubjects
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce(mockSubjectsData);

      const { result } = renderHook(() => useLmsSubjects());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.subjects).toEqual(mockSubjectsData);
      });
    });
  });

  describe('Стабильность функции refetch', () => {
    it('refetch не меняется между рендерами', async () => {
      const { result, rerender } = renderHook(() => useLmsSubjects());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const firstRefetch = result.current.refetch;

      rerender();

      expect(result.current.refetch).toBe(firstRefetch);
    });
  });
});
