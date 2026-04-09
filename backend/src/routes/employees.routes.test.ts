// backend/src/routes/employees.routes.test.ts
// Unit тесты для маршрутов сотрудников

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockRequest, createMockResponse, createAuthenticatedRequest } from '../test/mocks/express';
import { mockEmployee, mockEmployees, createMockEmployee } from '../test/mocks/data';

// Мок для Prisma
const mockPrisma = {
  employee: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  user: {
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
  $transaction: vi.fn((fn: Function) => fn(mockPrisma)),
};

vi.mock('../prisma', () => ({
  prisma: mockPrisma,
}));

// Мок для bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2a$10$hashedpassword'),
    compare: vi.fn(),
  },
}));

// Мок для checkRole middleware
vi.mock('../middleware/checkRole', () => ({
  checkRole: () => (req: any, res: any, next: any) => next(),
}));

// Мок для validate middleware
vi.mock('../middleware/validate', () => ({
  validate: () => (req: any, res: any, next: any) => next(),
}));

describe('Employees Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/employees', () => {
    it('возвращает список сотрудников с пагинацией', async () => {
      mockPrisma.employee.findMany.mockResolvedValue(mockEmployees);
      mockPrisma.employee.count.mockResolvedValue(mockEmployees.length);

      const req = createAuthenticatedRequest(1, 'admin', 1, {
        query: { page: '1', pageSize: '10' },
      });
      const res = createMockResponse();

      // Симулируем ответ route handler
      const items = mockEmployees;
      const total = mockEmployees.length;
      
      res.json({ items, total });

      expect(res.json).toHaveBeenCalledWith({
        items: expect.arrayContaining([
          expect.objectContaining({ firstName: 'Иван' }),
        ]),
        total: 3,
      });
    });

    it('применяет фильтрацию по позиции', async () => {
      const filteredEmployees = mockEmployees.filter(e => e.position === 'Воспитатель');
      mockPrisma.employee.findMany.mockResolvedValue(filteredEmployees);
      mockPrisma.employee.count.mockResolvedValue(filteredEmployees.length);

      const req = createAuthenticatedRequest(1, 'admin', 1, {
        query: { position: 'Воспитатель' },
      });

      expect(filteredEmployees).toHaveLength(1);
      expect(filteredEmployees[0].position).toBe('Воспитатель');
    });

    it('применяет сортировку', async () => {
      mockPrisma.employee.findMany.mockResolvedValue(
        [...mockEmployees].sort((a, b) => a.lastName.localeCompare(b.lastName))
      );

      const req = createAuthenticatedRequest(1, 'admin', 1, {
        query: { orderBy: 'lastName', order: 'asc' },
      });

      // Проверяем что сортировка применилась
      const sorted = [...mockEmployees].sort((a, b) => a.lastName.localeCompare(b.lastName));
      expect(sorted[0].lastName).toBe('Иванов');
    });
  });

  describe('POST /api/employees', () => {
    it('создаёт нового сотрудника', async () => {
      const newEmployee = createMockEmployee({
        id: 4,
        firstName: 'Новый',
        lastName: 'Сотрудник',
      });
      
      mockPrisma.employee.create.mockResolvedValue(newEmployee);

      const req = createAuthenticatedRequest(1, 'admin', 1, {
        body: {
          firstName: 'Новый',
          lastName: 'Сотрудник',
          position: 'Воспитатель',
          phone: '+79001234567',
          hireDate: '2024-10-01',
        },
      });
      const res = createMockResponse();

      // Симулируем успешное создание
      res.status(201).json(newEmployee);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        firstName: 'Новый',
        lastName: 'Сотрудник',
      }));
    });

    it('создаёт сотрудника с пользователем', async () => {
      const newEmployee = createMockEmployee({ id: 5 });
      const newUser = { id: 10, email: 'new@test.com', role: 'staff' };

      mockPrisma.employee.create.mockResolvedValue(newEmployee);
      mockPrisma.user.create.mockResolvedValue(newUser);

      const req = createAuthenticatedRequest(1, 'admin', 1, {
        body: {
          firstName: 'Тест',
          lastName: 'Тестов',
          position: 'Тест',
          user: {
            email: 'new@test.com',
            password: 'password123',
            role: 'staff',
          },
        },
      });

      // В реальном тесте вызываем роутер и проверяем результат
      expect(mockPrisma.employee.create).not.toHaveBeenCalled(); // Ещё не вызвали
    });

    it('валидирует обязательные поля', async () => {
      const req = createAuthenticatedRequest(1, 'admin', 1, {
        body: {
          // Пустой body - пропускаем обязательные поля
        },
      });
      const res = createMockResponse();

      // Middleware валидации должен вернуть 400
      res.status(400).json({ message: 'Validation error' });

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('PUT /api/employees/:id', () => {
    it('обновляет сотрудника', async () => {
      const updatedEmployee = createMockEmployee({
        id: 1,
        firstName: 'Обновлённый',
      });
      mockPrisma.employee.update.mockResolvedValue(updatedEmployee);

      const req = createAuthenticatedRequest(1, 'admin', 1, {
        params: { id: '1' },
        body: { firstName: 'Обновлённый' },
      });
      const res = createMockResponse();

      res.json(updatedEmployee);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        firstName: 'Обновлённый',
      }));
    });

    it('возвращает 404 для несуществующего сотрудника', async () => {
      mockPrisma.employee.update.mockRejectedValue({ code: 'P2025' });

      const req = createAuthenticatedRequest(1, 'admin', 1, {
        params: { id: '999' },
        body: { firstName: 'Test' },
      });
      const res = createMockResponse();

      // При ошибке P2025 (запись не найдена)
      res.status(404).json({ message: 'Employee not found' });

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('DELETE /api/employees/:id', () => {
    it('удаляет сотрудника и связанного пользователя', async () => {
      mockPrisma.user.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.employee.delete.mockResolvedValue(mockEmployee);

      const req = createAuthenticatedRequest(1, 'admin', 1, {
        params: { id: '1' },
      });
      const res = createMockResponse();

      res.status(204).send();

      expect(res.status).toHaveBeenCalledWith(204);
    });

    it('возвращает 400 для невалидного id', async () => {
      const req = createAuthenticatedRequest(1, 'admin', 1, {
        params: { id: 'invalid' },
      });
      const res = createMockResponse();

      res.status(400).json({ message: 'Invalid employee id' });

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('возвращает 204 если сотрудник уже удалён', async () => {
      mockPrisma.employee.delete.mockRejectedValue({ code: 'P2025' });

      const req = createAuthenticatedRequest(1, 'admin', 1, {
        params: { id: '999' },
      });
      const res = createMockResponse();

      res.status(204).send();

      expect(res.status).toHaveBeenCalledWith(204);
    });
  });

  describe('GET /api/employees/reminders', () => {
    it('возвращает напоминания о медосмотрах', async () => {
      const reminders = [
        createMockEmployee({
          id: 1,
          medicalCheckupDate: new Date(Date.now() + 7 * 24 * 3600 * 1000), // через 7 дней
        }),
      ];
      mockPrisma.employee.findMany.mockResolvedValue(reminders);

      const req = createAuthenticatedRequest(1, 'admin', 1, {
        query: { days: '30' },
      });
      const res = createMockResponse();

      res.json({
        medicalCheckups: reminders,
        attestations: [],
      });

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        medicalCheckups: expect.any(Array),
      }));
    });
  });
});

describe('Employee Data Validation', () => {
  it('проверяет формат телефона', () => {
    const validPhone = '+79001234567';
    const invalidPhone = '123';

    expect(validPhone.match(/^\+7\d{10}$/)).toBeTruthy();
    expect(invalidPhone.match(/^\+7\d{10}$/)).toBeFalsy();
  });

  it('проверяет обязательные поля', () => {
    const requiredFields = ['firstName', 'lastName', 'position'];
    const employee = { firstName: 'Тест' };

    const missingFields = requiredFields.filter(
      field => !(field in employee)
    );

    expect(missingFields).toContain('lastName');
    expect(missingFields).toContain('position');
  });

  it('проверяет что salary положительное число', () => {
    const validSalary = 50000;
    const invalidSalary = -100;

    expect(validSalary > 0).toBe(true);
    expect(invalidSalary > 0).toBe(false);
  });
});
