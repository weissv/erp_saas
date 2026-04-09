// src/hooks/lms/useLmsClasses.test.tsx
// Расширенные unit тесты для useLmsClasses хука

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useLmsClasses } from './useLmsClasses';

// Мок для lmsApi
const mockGetClasses = vi.fn();

vi.mock('../../lib/lms-api', () => ({
  lmsApi: {
    getClasses: (...args: any[]) => mockGetClasses(...args),
  },
}));

describe('useLmsClasses', () => {
  const mockClassesData = [
    {
      id: 1,
      name: '1А',
      grade: 1,
      academicYear: '2024-2025',
      teacherId: 1,
      teacherName: 'Смирнов А.П.',
      studentsCount: 25,
      isActive: true,
    },
    {
      id: 2,
      name: '1Б',
      grade: 1,
      academicYear: '2024-2025',
      teacherId: 2,
      teacherName: 'Козлова Е.В.',
      studentsCount: 23,
      isActive: true,
    },
    {
      id: 3,
      name: '2А',
      grade: 2,
      academicYear: '2024-2025',
      teacherId: 1,
      teacherName: 'Смирнов А.П.',
      studentsCount: 22,
      isActive: true,
    },
    {
      id: 4,
      name: '11А',
      grade: 11,
      academicYear: '2023-2024',
      teacherId: 3,
      teacherName: 'Петров И.С.',
      studentsCount: 20,
      isActive: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClasses.mockResolvedValue(mockClassesData);
  });

  describe('Инициализация', () => {
    it('начинает с loading = true', () => {
      mockGetClasses.mockImplementation(() => new Promise(() => {}));
      
      const { result } = renderHook(() => useLmsClasses());

      expect(result.current.loading).toBe(true);
      expect(result.current.classes).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Загрузка данных', () => {
    it('загружает классы при монтировании', async () => {
      const { result } = renderHook(() => useLmsClasses());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.classes).toEqual(mockClassesData);
        expect(result.current.error).toBeNull();
      });

      expect(mockGetClasses).toHaveBeenCalledTimes(1);
    });

    it('передаёт параметры в API', async () => {
      const options = { isActive: true, grade: 1, academicYear: '2024-2025' };
      
      renderHook(() => useLmsClasses(options));

      await waitFor(() => {
        expect(mockGetClasses).toHaveBeenCalledWith(options);
      });
    });

    it('загружает только активные классы с isActive: true', async () => {
      const activeClasses = mockClassesData.filter(c => c.isActive);
      mockGetClasses.mockResolvedValue(activeClasses);

      const { result } = renderHook(() => useLmsClasses({ isActive: true }));

      await waitFor(() => {
        expect(result.current.classes).toHaveLength(3);
        expect(result.current.classes.every(c => c.isActive)).toBe(true);
      });
    });

    it('фильтрует классы по параллели (grade)', async () => {
      const grade1Classes = mockClassesData.filter(c => c.grade === 1);
      mockGetClasses.mockResolvedValue(grade1Classes);

      const { result } = renderHook(() => useLmsClasses({ grade: 1 }));

      await waitFor(() => {
        expect(result.current.classes).toHaveLength(2);
        expect(result.current.classes.every(c => c.grade === 1)).toBe(true);
      });
    });
  });

  describe('Обработка ошибок', () => {
    it('устанавливает error при неудачном запросе', async () => {
      const error = new Error('Network error');
      mockGetClasses.mockRejectedValue(error);

      const { result } = renderHook(() => useLmsClasses());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe(error);
        expect(result.current.classes).toEqual([]);
      });
    });

    it('error является инстансом Error', async () => {
      mockGetClasses.mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useLmsClasses());

      await waitFor(() => {
        expect(result.current.error).toBeInstanceOf(Error);
      });
    });
  });

  describe('refetch', () => {
    it('повторно загружает данные', async () => {
      const { result } = renderHook(() => useLmsClasses());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetClasses).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockGetClasses).toHaveBeenCalledTimes(2);
    });

    it('обновляет данные после refetch', async () => {
      const newClass = {
        id: 5,
        name: '3А',
        grade: 3,
        academicYear: '2024-2025',
        teacherId: 4,
        teacherName: 'Новый Учитель',
        studentsCount: 18,
        isActive: true,
      };

      mockGetClasses
        .mockResolvedValueOnce(mockClassesData)
        .mockResolvedValueOnce([...mockClassesData, newClass]);

      const { result } = renderHook(() => useLmsClasses());

      await waitFor(() => {
        expect(result.current.classes).toHaveLength(4);
      });

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.classes).toHaveLength(5);
      });
    });

    it('сбрасывает error перед новым запросом', async () => {
      mockGetClasses
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce(mockClassesData);

      const { result } = renderHook(() => useLmsClasses());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.classes).toEqual(mockClassesData);
      });
    });
  });

  describe('Изменение параметров', () => {
    it('перезагружает данные при изменении academicYear', async () => {
      const { result, rerender } = renderHook(
        (options) => useLmsClasses(options),
        { initialProps: { academicYear: '2024-2025' } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetClasses).toHaveBeenCalledTimes(1);

      const oldClasses = mockClassesData.filter(c => c.academicYear === '2023-2024');
      mockGetClasses.mockResolvedValue(oldClasses);

      rerender({ academicYear: '2023-2024' });

      await waitFor(() => {
        expect(mockGetClasses).toHaveBeenCalledTimes(2);
        expect(mockGetClasses).toHaveBeenLastCalledWith({ academicYear: '2023-2024' });
      });
    });

    it('перезагружает данные при изменении grade', async () => {
      const { result, rerender } = renderHook(
        (options) => useLmsClasses(options),
        { initialProps: { grade: 1 } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      rerender({ grade: 2 });

      await waitFor(() => {
        expect(mockGetClasses).toHaveBeenLastCalledWith({ grade: 2 });
      });
    });

    it('перезагружает данные при изменении isActive', async () => {
      const { result, rerender } = renderHook(
        (options) => useLmsClasses(options),
        { initialProps: { isActive: true } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      rerender({ isActive: false });

      await waitFor(() => {
        expect(mockGetClasses).toHaveBeenLastCalledWith({ isActive: false });
      });
    });
  });

  describe('Стабильность функции refetch', () => {
    it('refetch не меняется между рендерами с одинаковыми параметрами', async () => {
      const { result, rerender } = renderHook(
        () => useLmsClasses({ isActive: true })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const firstRefetch = result.current.refetch;

      rerender();

      expect(result.current.refetch).toBe(firstRefetch);
    });
  });
});
