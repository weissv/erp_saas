// backend/src/utils/query.test.ts
// Unit тесты для утилит построения запросов

import { describe, it, expect } from 'vitest';
import { buildPagination, buildOrderBy, buildWhere, ListQuery } from './query';

describe('buildPagination', () => {
  describe('Дефолтные значения', () => {
    it('возвращает дефолты для пустого query', () => {
      const result = buildPagination({});

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(20);
    });

    it('возвращает дефолты для undefined', () => {
      const result = buildPagination({ page: undefined, pageSize: undefined });

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });
  });

  describe('Валидные значения', () => {
    it('правильно вычисляет skip и take', () => {
      const result = buildPagination({ page: '2', pageSize: '10' });

      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
      expect(result.skip).toBe(10); // (2-1) * 10
      expect(result.take).toBe(10);
    });

    it('обрабатывает первую страницу', () => {
      const result = buildPagination({ page: '1', pageSize: '50' });

      expect(result.skip).toBe(0);
    });

    it('обрабатывает большие номера страниц', () => {
      const result = buildPagination({ page: '100', pageSize: '25' });

      expect(result.skip).toBe(2475); // (100-1) * 25
    });
  });

  describe('Граничные случаи', () => {
    it('минимальная страница = 1', () => {
      const result = buildPagination({ page: '0' });

      expect(result.page).toBe(1);
    });

    it('отрицательные значения приводятся к минимальным', () => {
      const result = buildPagination({ page: '-5', pageSize: '-10' });

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(1);
    });

    it('максимальный pageSize = 200', () => {
      const result = buildPagination({ pageSize: '500' });

      expect(result.pageSize).toBe(200);
    });

    it('минимальный pageSize = 1', () => {
      const result = buildPagination({ pageSize: '0' });

      expect(result.pageSize).toBe(1);
    });
  });

  describe('Нечисловые значения', () => {
    it('NaN приводится к дефолтам', () => {
      const result = buildPagination({ page: 'abc', pageSize: 'xyz' });

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });
  });
});

describe('buildOrderBy', () => {
  describe('Дефолтные значения', () => {
    it('возвращает дефолтную сортировку по id', () => {
      const result = buildOrderBy({});

      expect(result).toEqual({ id: 'asc' });
    });

    it('использует первое поле из allowed', () => {
      const result = buildOrderBy({}, ['name', 'createdAt']);

      expect(result).toEqual({ name: 'asc' });
    });
  });

  describe('Валидные поля', () => {
    it('использует запрошенное поле если оно в allowed', () => {
      const result = buildOrderBy(
        { sortBy: 'firstName' },
        ['id', 'firstName', 'lastName']
      );

      expect(result).toEqual({ firstName: 'asc' });
    });

    it('игнорирует неразрешённое поле', () => {
      const result = buildOrderBy(
        { sortBy: 'passwordHash' },
        ['id', 'firstName']
      );

      expect(result).toEqual({ id: 'asc' });
    });
  });

  describe('Направление сортировки', () => {
    it('поддерживает asc', () => {
      const result = buildOrderBy({ sortBy: 'name', sortOrder: 'asc' }, ['name']);

      expect(result).toEqual({ name: 'asc' });
    });

    it('поддерживает desc', () => {
      const result = buildOrderBy({ sortBy: 'name', sortOrder: 'desc' }, ['name']);

      expect(result).toEqual({ name: 'desc' });
    });

    it('по умолчанию asc', () => {
      const result = buildOrderBy({ sortBy: 'name' }, ['name']);

      expect(result).toEqual({ name: 'asc' });
    });

    it('невалидные значения приводятся к asc', () => {
      const result = buildOrderBy(
        { sortBy: 'name', sortOrder: 'invalid' as any },
        ['name']
      );

      expect(result).toEqual({ name: 'asc' });
    });
  });
});

describe('buildWhere', () => {
  describe('Пустые значения', () => {
    it('возвращает пустой объект для пустого query', () => {
      const result = buildWhere({}, ['name', 'status']);

      expect(result).toEqual({});
    });

    it('игнорирует пустые строки', () => {
      const result = buildWhere({ name: '' }, ['name']);

      expect(result).toEqual({});
    });

    it('игнорирует undefined', () => {
      const result = buildWhere({ name: undefined }, ['name']);

      expect(result).toEqual({});
    });
  });

  describe('Фильтрация строк', () => {
    it('добавляет строковый фильтр', () => {
      const result = buildWhere({ status: 'active' }, ['status']);

      expect(result).toEqual({ status: 'active' });
    });

    it('добавляет несколько фильтров', () => {
      const result = buildWhere(
        { status: 'active', category: 'food' },
        ['status', 'category']
      );

      expect(result).toEqual({ status: 'active', category: 'food' });
    });
  });

  describe('Фильтрация чисел', () => {
    it('преобразует числовые строки в числа', () => {
      const result = buildWhere({ groupId: '5' }, ['groupId']);

      expect(result).toEqual({ groupId: 5 });
    });

    it('сохраняет строки если не число', () => {
      const result = buildWhere({ name: '123abc' }, ['name']);

      expect(result).toEqual({ name: '123abc' });
    });
  });

  describe('Безопасность', () => {
    it('игнорирует поля не в allowed', () => {
      const result = buildWhere(
        { name: 'test', dangerous: 'DROP TABLE' },
        ['name']
      );

      expect(result).toEqual({ name: 'test' });
      expect('dangerous' in result).toBe(false);
    });

    it('работает с пустым allowed', () => {
      const result = buildWhere({ name: 'test' }, []);

      expect(result).toEqual({});
    });
  });
});
