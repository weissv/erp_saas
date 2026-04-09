// src/hooks/lms/useLmsGradebook.test.ts
// Unit тесты для useLmsGradebook хука

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useLmsGradebook } from './useLmsGradebook';

// Мок для lmsApi
const mockGetGradebook = vi.fn();

vi.mock('../../lib/lms-api', () => ({
  lmsApi: {
    getGradebook: (...args: any[]) => mockGetGradebook(...args),
  },
}));

describe('useLmsGradebook', () => {
  const mockGradebookData = {
    classId: 1,
    subjectId: '1',
    className: '1А',
    subjectName: 'Математика',
    students: [
      {
        id: '1',
        name: 'Иванов Иван',
        grades: [
          { date: '2024-01-15', value: 5, type: 'homework' },
          { date: '2024-01-16', value: 4, type: 'classwork' },
        ],
        average: 4.5,
      },
      {
        id: '2',
        name: 'Петрова Анна',
        grades: [
          { date: '2024-01-15', value: 5, type: 'test' },
        ],
        average: 5.0,
      },
    ],
    dates: ['2024-01-15', '2024-01-16'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetGradebook.mockResolvedValue(mockGradebookData);
  });

  describe('Инициализация', () => {
    it('инициализируется с null значениями', () => {
      const { result } = renderHook(() => useLmsGradebook(null, null));

      expect(result.current.gradebook).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('не загружает данные если classId = null', async () => {
      renderHook(() => useLmsGradebook(null, '1'));

      await waitFor(() => {
        expect(mockGetGradebook).not.toHaveBeenCalled();
      });
    });

    it('не загружает данные если subjectId = null', async () => {
      renderHook(() => useLmsGradebook(1, null));

      await waitFor(() => {
        expect(mockGetGradebook).not.toHaveBeenCalled();
      });
    });
  });

  describe('Загрузка данных', () => {
    it('загружает данные журнала оценок', async () => {
      const { result } = renderHook(() => useLmsGradebook(1, '1'));

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.gradebook).toEqual(mockGradebookData);
      });

      expect(mockGetGradebook).toHaveBeenCalledWith(1, '1');
    });

    it('перезагружает данные при изменении classId', async () => {
      const { result, rerender } = renderHook(
        ({ classId, subjectId }) => useLmsGradebook(classId, subjectId),
        { initialProps: { classId: 1, subjectId: '1' } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetGradebook).toHaveBeenCalledTimes(1);

      rerender({ classId: 2, subjectId: '1' });

      await waitFor(() => {
        expect(mockGetGradebook).toHaveBeenCalledTimes(2);
        expect(mockGetGradebook).toHaveBeenLastCalledWith(2, '1');
      });
    });

    it('перезагружает данные при изменении subjectId', async () => {
      const { result, rerender } = renderHook(
        ({ classId, subjectId }) => useLmsGradebook(classId, subjectId),
        { initialProps: { classId: 1, subjectId: '1' } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      rerender({ classId: 1, subjectId: '2' });

      await waitFor(() => {
        expect(mockGetGradebook).toHaveBeenLastCalledWith(1, '2');
      });
    });
  });

  describe('Обработка ошибок', () => {
    it('устанавливает error при неудачном запросе', async () => {
      const error = new Error('Network error');
      mockGetGradebook.mockRejectedValue(error);

      const { result } = renderHook(() => useLmsGradebook(1, '1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe(error);
      });
    });

    it('устанавливает пустой gradebook при ошибке', async () => {
      mockGetGradebook.mockRejectedValue(new Error('Failed'));

      const { result } = renderHook(() => useLmsGradebook(1, '1'));

      await waitFor(() => {
        expect(result.current.gradebook).toEqual({
          students: [],
          dates: [],
          classId: 1,
          subjectId: '1',
        });
      });
    });
  });

  describe('refetch', () => {
    it('повторно загружает данные', async () => {
      const { result } = renderHook(() => useLmsGradebook(1, '1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetGradebook).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockGetGradebook).toHaveBeenCalledTimes(2);
    });

    it('обновляет данные после refetch', async () => {
      const updatedData = {
        ...mockGradebookData,
        students: [...mockGradebookData.students, {
          id: '3',
          name: 'Новый Ученик',
          grades: [],
          average: 0,
        }],
      };

      mockGetGradebook
        .mockResolvedValueOnce(mockGradebookData)
        .mockResolvedValueOnce(updatedData);

      const { result } = renderHook(() => useLmsGradebook(1, '1'));

      await waitFor(() => {
        expect(result.current.gradebook?.students).toHaveLength(2);
      });

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.gradebook?.students).toHaveLength(3);
      });
    });
  });
});
