// src/hooks/lms/useLmsSchedule.test.ts
// Unit тесты для useLmsSchedule хука

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useLmsSchedule } from './useLmsSchedule';

// Мок для lmsApi
const mockGetSchedule = vi.fn();

vi.mock('../../lib/lms-api', () => ({
  lmsApi: {
    getSchedule: (...args: any[]) => mockGetSchedule(...args),
  },
}));

describe('useLmsSchedule', () => {
  const mockScheduleData = [
    {
      id: 1,
      classId: 1,
      className: '1А',
      subjectId: 1,
      subjectName: 'Математика',
      teacherId: 1,
      teacherName: 'Смирнов А.П.',
      dayOfWeek: 1,
      startTime: '08:30',
      endTime: '09:15',
      room: '101',
    },
    {
      id: 2,
      classId: 1,
      className: '1А',
      subjectId: 2,
      subjectName: 'Русский язык',
      teacherId: 2,
      teacherName: 'Козлова Е.В.',
      dayOfWeek: 1,
      startTime: '09:25',
      endTime: '10:10',
      room: '102',
    },
    {
      id: 3,
      classId: 1,
      className: '1А',
      subjectId: 1,
      subjectName: 'Математика',
      teacherId: 1,
      teacherName: 'Смирнов А.П.',
      dayOfWeek: 2,
      startTime: '08:30',
      endTime: '09:15',
      room: '101',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSchedule.mockResolvedValue(mockScheduleData);
  });

  describe('Инициализация', () => {
    it('инициализируется с пустым массивом', () => {
      const { result } = renderHook(() => useLmsSchedule(null));

      expect(result.current.schedule).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('не загружает данные если classId = null', async () => {
      renderHook(() => useLmsSchedule(null));

      await waitFor(() => {
        expect(mockGetSchedule).not.toHaveBeenCalled();
      });
    });
  });

  describe('Загрузка данных', () => {
    it('загружает расписание для класса', async () => {
      const { result } = renderHook(() => useLmsSchedule(1));

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.schedule).toEqual(mockScheduleData);
      });

      expect(mockGetSchedule).toHaveBeenCalledWith({ classId: 1 });
    });

    it('перезагружает данные при изменении classId', async () => {
      const { result, rerender } = renderHook(
        (classId) => useLmsSchedule(classId),
        { initialProps: 1 }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetSchedule).toHaveBeenCalledTimes(1);

      const newSchedule = [
        {
          id: 4,
          classId: 2,
          className: '2А',
          subjectId: 1,
          subjectName: 'Математика',
          teacherId: 1,
          teacherName: 'Смирнов А.П.',
          dayOfWeek: 1,
          startTime: '09:25',
          endTime: '10:10',
          room: '103',
        },
      ];
      mockGetSchedule.mockResolvedValue(newSchedule);

      rerender(2);

      await waitFor(() => {
        expect(mockGetSchedule).toHaveBeenCalledTimes(2);
        expect(mockGetSchedule).toHaveBeenLastCalledWith({ classId: 2 });
        expect(result.current.schedule).toEqual(newSchedule);
      });
    });
  });

  describe('Обработка ошибок', () => {
    it('устанавливает error при неудачном запросе', async () => {
      const error = new Error('Network error');
      mockGetSchedule.mockRejectedValue(error);

      const { result } = renderHook(() => useLmsSchedule(1));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe(error);
      });
    });

    it('очищает расписание при ошибке', async () => {
      mockGetSchedule.mockRejectedValue(new Error('Failed'));

      const { result } = renderHook(() => useLmsSchedule(1));

      await waitFor(() => {
        expect(result.current.schedule).toEqual([]);
      });
    });
  });

  describe('refetch', () => {
    it('повторно загружает данные', async () => {
      const { result } = renderHook(() => useLmsSchedule(1));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetSchedule).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockGetSchedule).toHaveBeenCalledTimes(2);
    });

    it('не выполняется если classId = null', async () => {
      const { result } = renderHook(() => useLmsSchedule(null));

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockGetSchedule).not.toHaveBeenCalled();
    });
  });

  describe('Группировка по дням', () => {
    it('загружает расписание для нескольких дней недели', async () => {
      const { result } = renderHook(() => useLmsSchedule(1));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Проверяем что есть уроки для разных дней
      const dayOfWeeks = result.current.schedule.map((s) => s.dayOfWeek);
      expect(dayOfWeeks).toContain(1); // Понедельник
      expect(dayOfWeeks).toContain(2); // Вторник
    });
  });
});
