// src/test/mocks/lms-api.ts
// Моки для LMS API

import { vi } from 'vitest';
import type {
  LmsSchoolClass,
  LmsSchoolStudent,
  LmsSubject,
  LmsScheduleItem,
  LmsGrade,
  GradebookData,
} from '../../types/lms';

// ============================================================================
// МОКИ ДАННЫХ LMS
// ============================================================================

export const mockLmsClasses: LmsSchoolClass[] = [
  {
    id: 1,
    name: '1А',
    grade: 1,
    academicYear: '2024-2025',
    teacherId: 1,
    teacherName: 'Смирнов Алексей',
    studentsCount: 25,
    isActive: true,
  },
  {
    id: 2,
    name: '1Б',
    grade: 1,
    academicYear: '2024-2025',
    teacherId: 2,
    teacherName: 'Козлова Елена',
    studentsCount: 23,
    isActive: true,
  },
  {
    id: 3,
    name: '2А',
    grade: 2,
    academicYear: '2024-2025',
    teacherId: 1,
    teacherName: 'Смирнов Алексей',
    studentsCount: 22,
    isActive: true,
  },
  {
    id: 4,
    name: '11А',
    grade: 11,
    academicYear: '2023-2024',
    teacherId: 3,
    teacherName: 'Петров Иван',
    studentsCount: 20,
    isActive: false,
  },
];

export const mockLmsStudents: LmsSchoolStudent[] = [
  {
    id: '1',
    childId: 1,
    classId: 1,
    firstName: 'Иван',
    lastName: 'Иванов',
    middleName: 'Петрович',
    birthDate: '2016-03-15',
    enrollmentDate: '2023-09-01',
    status: 'active',
  },
  {
    id: '2',
    childId: 2,
    classId: 1,
    firstName: 'Анна',
    lastName: 'Петрова',
    middleName: 'Сергеевна',
    birthDate: '2016-07-22',
    enrollmentDate: '2023-09-01',
    status: 'active',
  },
  {
    id: '3',
    childId: 3,
    classId: 2,
    firstName: 'Дмитрий',
    lastName: 'Сидоров',
    middleName: 'Александрович',
    birthDate: '2016-01-10',
    enrollmentDate: '2023-09-01',
    status: 'active',
  },
];

export const mockLmsSubjects: LmsSubject[] = [
  { id: 1, name: 'Математика', description: 'Основы математики', grade: 1, hoursPerWeek: 5 },
  { id: 2, name: 'Русский язык', description: 'Грамматика и письмо', grade: 1, hoursPerWeek: 5 },
  { id: 3, name: 'Литературное чтение', description: 'Чтение и анализ текстов', grade: 1, hoursPerWeek: 4 },
  { id: 4, name: 'Окружающий мир', description: 'Познание мира', grade: 1, hoursPerWeek: 2 },
  { id: 5, name: 'Физическая культура', description: 'Физическое развитие', grade: 1, hoursPerWeek: 3 },
];

export const mockLmsSchedule: LmsScheduleItem[] = [
  {
    id: 1,
    classId: 1,
    className: '1А',
    subjectId: 1,
    subjectName: 'Математика',
    teacherId: 1,
    teacherName: 'Смирнов Алексей',
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
    teacherName: 'Козлова Елена',
    dayOfWeek: 1,
    startTime: '09:25',
    endTime: '10:10',
    room: '102',
  },
  {
    id: 3,
    classId: 1,
    className: '1А',
    subjectId: 3,
    subjectName: 'Литературное чтение',
    teacherId: 2,
    teacherName: 'Козлова Елена',
    dayOfWeek: 1,
    startTime: '10:30',
    endTime: '11:15',
    room: '102',
  },
];

export const mockLmsGrades: LmsGrade[] = [
  {
    id: 1,
    studentId: '1',
    subjectId: 1,
    teacherId: 1,
    value: 5,
    date: '2024-01-15',
    type: 'homework',
    comment: 'Отлично выполненное домашнее задание',
  },
  {
    id: 2,
    studentId: '1',
    subjectId: 1,
    teacherId: 1,
    value: 4,
    date: '2024-01-16',
    type: 'classwork',
    comment: 'Хорошая работа на уроке',
  },
  {
    id: 3,
    studentId: '2',
    subjectId: 1,
    teacherId: 1,
    value: 5,
    date: '2024-01-15',
    type: 'test',
    comment: 'Превосходный результат на контрольной',
  },
  {
    id: 4,
    studentId: '1',
    subjectId: 2,
    teacherId: 2,
    value: 3,
    date: '2024-01-15',
    type: 'homework',
    comment: 'Есть ошибки, нужно повторить правила',
  },
];

export const mockGradebookData: GradebookData = {
  classId: 1,
  className: '1А',
  subjectId: 1,
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
};

// ============================================================================
// МОК LMS API
// ============================================================================

export const mockLmsApiModule = {
  // Классы
  getClasses: vi.fn().mockResolvedValue(mockLmsClasses),
  getClass: vi.fn().mockImplementation((id: number) =>
    Promise.resolve(mockLmsClasses.find((c) => c.id === id) || null)
  ),
  createClass: vi.fn().mockImplementation((data: any) =>
    Promise.resolve({ id: Math.random(), ...data })
  ),
  updateClass: vi.fn().mockImplementation((id: number, data: any) =>
    Promise.resolve({ id, ...data })
  ),
  deleteClass: vi.fn().mockResolvedValue({ success: true }),

  // Ученики
  getStudents: vi.fn().mockImplementation((classId: number) =>
    Promise.resolve(mockLmsStudents.filter((s) => s.classId === classId))
  ),
  createStudent: vi.fn().mockImplementation((data: any) =>
    Promise.resolve({ id: String(Math.random()), ...data })
  ),
  updateStudent: vi.fn().mockImplementation((id: string, data: any) =>
    Promise.resolve({ id, ...data })
  ),

  // Предметы
  getSubjects: vi.fn().mockResolvedValue(mockLmsSubjects),
  createSubject: vi.fn().mockImplementation((data: any) =>
    Promise.resolve({ id: Math.random(), ...data })
  ),

  // Расписание
  getSchedule: vi.fn().mockResolvedValue(mockLmsSchedule),
  createScheduleItem: vi.fn().mockImplementation((data: any) =>
    Promise.resolve({ id: Math.random(), ...data })
  ),
  updateScheduleItem: vi.fn().mockImplementation((id: number, data: any) =>
    Promise.resolve({ id, ...data })
  ),
  deleteScheduleItem: vi.fn().mockResolvedValue({ success: true }),

  // Оценки
  getGrades: vi.fn().mockImplementation((params?: { studentId?: string; subjectId?: number }) => {
    let grades = mockLmsGrades;
    if (params?.studentId) {
      grades = grades.filter((g) => g.studentId === params.studentId);
    }
    if (params?.subjectId) {
      grades = grades.filter((g) => g.subjectId === params.subjectId);
    }
    return Promise.resolve(grades);
  }),
  createGrade: vi.fn().mockImplementation((data: any) =>
    Promise.resolve({ id: Math.random(), ...data })
  ),
  updateGrade: vi.fn().mockImplementation((id: number, data: any) =>
    Promise.resolve({ id, ...data })
  ),
  deleteGrade: vi.fn().mockResolvedValue({ success: true }),

  // Журнал
  getGradebook: vi.fn().mockResolvedValue(mockGradebookData),
};

export const setupLmsApiMocks = () => {
  vi.mock('../../lib/lms-api', () => ({
    lmsApi: mockLmsApiModule,
  }));
};

export const resetLmsApiMocks = () => {
  Object.values(mockLmsApiModule).forEach((mock) => {
    if (typeof mock.mockClear === 'function') {
      mock.mockClear();
    }
  });
};
