// backend/src/test/mocks/data.ts
// Фабрики тестовых данных

import { vi } from 'vitest';

// ============================================================================
// ПОЛЬЗОВАТЕЛИ
// ============================================================================

export const mockUser = {
  id: 1,
  email: 'admin@test.com',
  passwordHash: '$2a$10$hashedpassword',
  role: 'admin',
  employeeId: 1,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockUserWithEmployee = {
  ...mockUser,
  employee: {
    id: 1,
    firstName: 'Иван',
    lastName: 'Иванов',
    position: 'Администратор',
    phone: '+79001234567',
    email: 'admin@test.com',
  },
};

export function createMockUser(overrides: Partial<typeof mockUser> = {}) {
  return { ...mockUser, ...overrides };
}

// ============================================================================
// СОТРУДНИКИ
// ============================================================================

export const mockEmployee = {
  id: 1,
  firstName: 'Иван',
  lastName: 'Иванов',
  middleName: 'Петрович',
  position: 'Воспитатель',
  phone: '+79001234567',
  email: 'ivan@test.com',
  hireDate: new Date('2023-01-15'),
  medicalCheckupDate: null as Date | null,
  salary: 50000,
  groupId: 1,
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export function createMockEmployee(overrides: Partial<typeof mockEmployee> = {}) {
  return { ...mockEmployee, ...overrides };
}

export const mockEmployees = [
  mockEmployee,
  createMockEmployee({ id: 2, firstName: 'Мария', lastName: 'Петрова', position: 'Методист' }),
  createMockEmployee({ id: 3, firstName: 'Алексей', lastName: 'Сидоров', position: 'Повар' }),
];

// ============================================================================
// ГРУППЫ
// ============================================================================

export const mockGroup = {
  id: 1,
  name: 'Младшая группа',
  ageRange: '3-4 года',
  capacity: 25,
  teacherId: 1,
  description: 'Группа для детей 3-4 лет',
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export function createMockGroup(overrides: Partial<typeof mockGroup> = {}) {
  return { ...mockGroup, ...overrides };
}

export const mockGroups = [
  mockGroup,
  createMockGroup({ id: 2, name: 'Средняя группа', ageRange: '4-5 лет' }),
  createMockGroup({ id: 3, name: 'Старшая группа', ageRange: '5-6 лет' }),
];

// ============================================================================
// ДЕТИ
// ============================================================================

export const mockChild = {
  id: 'child-1',
  firstName: 'Максим',
  lastName: 'Смирнов',
  middleName: 'Алексеевич',
  birthDate: new Date('2020-05-15'),
  groupId: 1,
  parentName: 'Смирнова Елена Владимировна',
  parentPhone: '+79009876543',
  parentEmail: 'smirnova@test.com',
  address: 'ул. Ленина, д. 10, кв. 5',
  medicalInfo: 'Аллергия на орехи',
  enrollmentDate: new Date('2024-09-01'),
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export function createMockChild(overrides: Partial<typeof mockChild> = {}) {
  return { ...mockChild, ...overrides };
}

export const mockChildren = [
  mockChild,
  createMockChild({ id: 'child-2', firstName: 'Анна', lastName: 'Козлова', groupId: 1 }),
  createMockChild({ id: 'child-3', firstName: 'Дмитрий', lastName: 'Морозов', groupId: 2 }),
];

// ============================================================================
// ПОСЕЩАЕМОСТЬ
// ============================================================================

export const mockAttendance = {
  id: 'att-1',
  childId: 'child-1',
  date: new Date('2024-10-15'),
  status: 'present',
  arrivalTime: '08:00',
  departureTime: '18:00',
  notes: '',
  createdAt: new Date('2024-10-15'),
  updatedAt: new Date('2024-10-15'),
};

export function createMockAttendance(overrides: Partial<typeof mockAttendance> = {}) {
  return { ...mockAttendance, ...overrides };
}

// ============================================================================
// МЕНЮ
// ============================================================================

export const mockMenuItem = {
  id: 1,
  name: 'Каша овсяная',
  description: 'Овсяная каша на молоке',
  category: 'breakfast',
  calories: 250,
  proteins: 8,
  fats: 5,
  carbohydrates: 45,
  allergens: ['молоко', 'глютен'],
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export function createMockMenuItem(overrides: Partial<typeof mockMenuItem> = {}) {
  return { ...mockMenuItem, ...overrides };
}

// ============================================================================
// ФИНАНСЫ
// ============================================================================

export const mockFinanceRecord = {
  id: 'fin-1',
  type: 'income',
  category: 'tuition',
  amount: 15000,
  description: 'Оплата за обучение - Октябрь',
  date: new Date('2024-10-01'),
  childId: 'child-1',
  employeeId: null,
  createdAt: new Date('2024-10-01'),
  updatedAt: new Date('2024-10-01'),
};

export function createMockFinanceRecord(overrides: Partial<typeof mockFinanceRecord> = {}) {
  return { ...mockFinanceRecord, ...overrides };
}

// ============================================================================
// ИНВЕНТАРЬ
// ============================================================================

export const mockInventoryItem = {
  id: 1,
  name: 'Карандаши цветные',
  category: 'канцелярия',
  quantity: 50,
  unit: 'шт',
  minQuantity: 20,
  location: 'Склад 1',
  lastRestocked: new Date('2024-10-01'),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-10-01'),
};

export function createMockInventoryItem(overrides: Partial<typeof mockInventoryItem> = {}) {
  return { ...mockInventoryItem, ...overrides };
}

// ============================================================================
// LMS - ШКОЛА
// ============================================================================

export const mockLmsClass = {
  id: 1,
  name: '5А',
  grade: 5,
  academicYear: '2024-2025',
  homeroomTeacherId: 1,
  isActive: true,
  createdAt: new Date('2024-09-01'),
  updatedAt: new Date('2024-09-01'),
};

export const mockLmsStudent = {
  id: 'student-1',
  firstName: 'Пётр',
  lastName: 'Петров',
  classId: 1,
  enrollmentDate: new Date('2024-09-01'),
  isActive: true,
};

export const mockLmsSubject = {
  id: 'subject-1',
  name: 'Математика',
  description: 'Алгебра и геометрия',
  grade: 5,
  hoursPerWeek: 5,
};

export const mockLmsGrade = {
  id: 'grade-1',
  studentId: 'student-1',
  subjectId: 'subject-1',
  classId: 1,
  value: 5,
  type: 'homework',
  date: new Date('2024-10-15'),
  comment: 'Отлично!',
  teacherId: 1,
};

export const mockLmsScheduleItem = {
  id: 'schedule-1',
  classId: 1,
  subjectId: 'subject-1',
  teacherId: 1,
  dayOfWeek: 1,
  lessonNumber: 1,
  startTime: '08:00',
  endTime: '08:45',
  room: '101',
};

// ============================================================================
// ЭКЗАМЕНЫ
// ============================================================================

export const mockExam = {
  id: 'exam-1',
  title: 'Экзамен по экономике №1',
  description: 'Рубежный контроль',
  duration: 90,
  passingScore: 60,
  isActive: true,
  createdAt: new Date('2024-10-01'),
  updatedAt: new Date('2024-10-01'),
};

export const mockExamQuestion = {
  id: 'q-1',
  examId: 'exam-1',
  text: 'Что такое инфляция?',
  type: 'multiple_choice',
  options: ['Рост цен', 'Снижение цен', 'Стабильные цены', 'Не знаю'],
  correctAnswer: 0,
  points: 10,
};
