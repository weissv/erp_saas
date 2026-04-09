// src/test/mocks/api.ts
// Моки для API запросов

import { vi } from 'vitest';

// ============================================================================
// ТИПЫ
// ============================================================================

export interface MockApiResponse<T = any> {
  data?: T;
  error?: string;
  status?: number;
}

export interface MockApiConfig {
  delay?: number;
  shouldFail?: boolean;
  errorMessage?: string;
  errorCode?: number;
}

// ============================================================================
// ФАБРИКА МОКОВ API
// ============================================================================

export const createApiMock = <T>(response: T, config: MockApiConfig = {}) => {
  const { delay = 0, shouldFail = false, errorMessage = 'API Error', errorCode = 500 } = config;

  return vi.fn().mockImplementation(() => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (shouldFail) {
          reject(new Error(errorMessage));
        } else {
          resolve(response);
        }
      }, delay);
    });
  });
};

// ============================================================================
// МОКИ ДАННЫХ
// ============================================================================

export const mockChildren = [
  {
    id: 1,
    firstName: 'Иван',
    lastName: 'Иванов',
    birthDate: '2018-03-15',
    groupId: 1,
    groupName: 'Младшая группа',
    parentName: 'Иванова Мария',
    parentPhone: '+998901234567',
    status: 'active',
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 2,
    firstName: 'Анна',
    lastName: 'Петрова',
    birthDate: '2017-07-22',
    groupId: 2,
    groupName: 'Средняя группа',
    parentName: 'Петрова Ольга',
    parentPhone: '+998907654321',
    status: 'active',
    createdAt: '2024-01-16T10:00:00Z',
  },
];

export const mockEmployees = [
  {
    id: 1,
    firstName: 'Алексей',
    lastName: 'Смирнов',
    position: 'Воспитатель',
    email: 'smirnov@example.com',
    phone: '+998901234567',
    department: 'Педагогический отдел',
    hireDate: '2022-09-01',
    status: 'active',
  },
  {
    id: 2,
    firstName: 'Елена',
    lastName: 'Козлова',
    position: 'Методист',
    email: 'kozlova@example.com',
    phone: '+998907654321',
    department: 'Методический отдел',
    hireDate: '2021-03-15',
    status: 'active',
  },
];

export const mockGroups = [
  { id: 1, name: 'Младшая группа', capacity: 20, childrenCount: 15, teacherId: 1 },
  { id: 2, name: 'Средняя группа', capacity: 25, childrenCount: 22, teacherId: 2 },
  { id: 3, name: 'Старшая группа', capacity: 25, childrenCount: 20, teacherId: 1 },
];

export const mockAttendance = [
  { id: 1, childId: 1, date: '2024-01-15', status: 'present', notes: null },
  { id: 2, childId: 2, date: '2024-01-15', status: 'absent', notes: 'Болезнь' },
  { id: 3, childId: 1, date: '2024-01-16', status: 'present', notes: null },
];

export const mockMenu = [
  {
    id: 1,
    date: '2024-01-15',
    mealType: 'breakfast',
    items: ['Каша овсяная', 'Чай с молоком', 'Бутерброд с сыром'],
  },
  {
    id: 2,
    date: '2024-01-15',
    mealType: 'lunch',
    items: ['Суп куриный', 'Котлета с гарниром', 'Компот'],
  },
];

export const mockFinanceRecords = [
  {
    id: 1,
    type: 'income',
    amount: 500000,
    description: 'Оплата за обучение',
    date: '2024-01-15',
    category: 'tuition',
  },
  {
    id: 2,
    type: 'expense',
    amount: 150000,
    description: 'Закупка продуктов',
    date: '2024-01-15',
    category: 'food',
  },
];

export const mockDashboardStats = {
  totalChildren: 57,
  totalEmployees: 15,
  attendanceToday: 52,
  pendingPayments: 5,
  recentActivities: [
    { id: 1, type: 'child_added', message: 'Добавлен новый ребенок', timestamp: '2024-01-15T10:00:00Z' },
    { id: 2, type: 'payment_received', message: 'Получена оплата', timestamp: '2024-01-15T09:30:00Z' },
  ],
};

// ============================================================================
// LMS МОКИ
// ============================================================================

export const mockLmsClasses = [
  { id: 1, name: '1А', grade: 1, academicYear: '2024-2025', teacherId: 1, isActive: true },
  { id: 2, name: '1Б', grade: 1, academicYear: '2024-2025', teacherId: 2, isActive: true },
  { id: 3, name: '2А', grade: 2, academicYear: '2024-2025', teacherId: 1, isActive: true },
];

export const mockLmsSubjects = [
  { id: 1, name: 'Математика', description: 'Основы математики', grade: 1, hoursPerWeek: 5 },
  { id: 2, name: 'Русский язык', description: 'Грамматика и письмо', grade: 1, hoursPerWeek: 5 },
  { id: 3, name: 'Чтение', description: 'Литературное чтение', grade: 1, hoursPerWeek: 4 },
];

export const mockLmsSchedule = [
  {
    id: 1,
    classId: 1,
    subjectId: 1,
    teacherId: 1,
    dayOfWeek: 1,
    startTime: '08:30',
    endTime: '09:15',
    room: '101',
  },
  {
    id: 2,
    classId: 1,
    subjectId: 2,
    teacherId: 2,
    dayOfWeek: 1,
    startTime: '09:25',
    endTime: '10:10',
    room: '102',
  },
];

export const mockLmsGrades = [
  { id: 1, studentId: 1, subjectId: 1, value: 5, date: '2024-01-15', type: 'homework', comment: 'Отлично!' },
  { id: 2, studentId: 1, subjectId: 1, value: 4, date: '2024-01-16', type: 'classwork', comment: 'Хорошо' },
  { id: 3, studentId: 2, subjectId: 1, value: 3, date: '2024-01-15', type: 'test', comment: 'Надо подтянуть' },
];

// ============================================================================
// ХЕЛПЕРЫ ДЛЯ СОЗДАНИЯ МОКОВ
// ============================================================================

export const mockApiModule = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  setToken: vi.fn(),
  setOnUnauthorized: vi.fn(),
};

export const setupApiMocks = () => {
  vi.mock('../../lib/api', () => ({
    api: mockApiModule,
    ApiRequestError: class extends Error {
      statusCode: number;
      code: string;
      constructor(message: string, statusCode: number, code = 'API_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
      }
    },
    getApiErrorMessage: vi.fn((err) => err?.message || 'Unknown error'),
  }));
};

export const resetApiMocks = () => {
  Object.values(mockApiModule).forEach((mock) => {
    if (typeof mock.mockClear === 'function') {
      mock.mockClear();
    }
  });
};
