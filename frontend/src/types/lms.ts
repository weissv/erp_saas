// src/types/lms.ts

// ============================================================================
// ШКОЛЬНАЯ LMS - Типы
// ============================================================================

// Школьный класс (объединённый с ERP Group)
export interface LmsSchoolClass {
  id: number; // Group id (Int)
  name: string;
  grade?: number | null;
  academicYear?: string | null;
  teacherId?: number | null;
  capacity?: number;
  description?: string | null;
  studentsCount?: number;
  lmsStudentsCount?: number;
  teacher?: {
    id: number;
    firstName: string;
    lastName: string;
  } | null;
  children?: Array<{
    id: number;
    firstName: string;
    lastName: string;
    birthDate?: string;
    status?: string;
  }>;
  lmsStudents?: LmsSchoolStudent[];
  createdAt: string;
  updatedAt: string;
}

// Ученик школы (связь Child с классом для LMS)
export interface LmsSchoolStudent {
  id: string;
  studentId: number;
  classId: number; // Group id (Int)
  enrollmentDate: string;
  status: string;
  student?: {
    id: number;
    firstName: string;
    lastName: string;
    birthDate?: string;
  };
  class?: LmsSchoolClass;
  createdAt: string;
  updatedAt: string;
}

// Предмет
export interface LmsSubject {
  id: string;
  name: string;
  description?: string;
  grade?: number;
  hoursPerWeek?: number;
  createdAt: string;
  updatedAt?: string;
}

// Элемент расписания
export interface LmsScheduleItem {
  id: string;
  classId: number; // Group id (Int)
  subjectId: string;
  teacherId?: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room?: string;
  class?: { id: number; name: string; grade?: number | null };
  subject?: { id: string; name: string };
  teacher?: {
    id: number;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Оценка
export interface LmsGrade {
  id: string;
  studentId: string;
  subjectId: string;
  classId: number; // Group id (Int)
  teacherId?: number;
  value: number;
  maxValue: number;
  gradeType: string;
  date: string;
  comment?: string;
  student?: LmsSchoolStudent;
  subject?: { id: string; name: string };
  class?: { id: number; name: string };
  teacher?: { id: number; firstName: string; lastName: string };
  createdAt: string;
  updatedAt: string;
}

// Домашнее задание
export interface LmsHomework {
  id: string;
  classId: number; // Group id (Int)
  subjectId: string;
  teacherId: number;
  title: string;
  description?: string;
  dueDate: string;
  maxPoints: number;
  status: string;
  submissionsCount?: number;
  class?: { id: number; name: string };
  subject?: { id: string; name: string };
  teacher?: {
    id: number;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Сдача домашнего задания
export interface LmsHomeworkSubmission {
  id: string;
  homeworkId: string;
  studentId: string;
  content?: string;
  attachmentUrl?: string;
  submittedAt: string;
  points?: number;
  feedback?: string;
  gradedAt?: string;
  gradedBy?: string;
  student?: LmsSchoolStudent;
}

// Посещаемость ученика
export interface LmsStudentAttendance {
  id: string;
  studentId: string;
  classId: number; // Group id (Int)
  scheduleItemId?: string;
  date: string;
  status: string;
  note?: string;
  student?: LmsSchoolStudent;
  class?: { id: number; name: string };
  createdAt: string;
  updatedAt: string;
}

// Объявление класса
export interface LmsClassAnnouncement {
  id: number;
  classId?: number | null; // Group id (Int)
  title: string;
  content: string;
  authorId: number;
  isPinned: boolean;
  expiresAt?: string;
  author?: {
    id: number;
    email: string;
    employee?: { firstName: string; lastName: string };
  };
  createdAt: string;
  updatedAt: string;
}

// Журнал оценок
export interface GradebookData {
  students: {
    student: LmsSchoolStudent;
    grades: LmsGrade[];
    average: number;
  }[];
  dates: string[];
  classId: number; // Group id (Int)
  subjectId: string;
}

// Статистика школы
export interface SchoolStats {
  totalClasses: number;
  totalStudents: number;
  totalSubjects: number;
  attendanceStats: {
    present: number;
    absent: number;
    late: number;
    excused: number;
  };
  recentGrades: LmsGrade[];
  upcomingHomework: number;
}

// Form types для школы
export interface SchoolClassFormData {
  name: string;
  grade?: number | null;
  academicYear?: string | null;
  teacherId?: number | null;
  capacity?: number;
  description?: string | null;
}

export interface StudentFormData {
  studentId: number; // Child ID
  classId: number; // Group id (Int)
}

export interface GradeFormData {
  studentId: string;
  subjectId: string;
  classId: number; // Group id (Int)
  value: number;
  gradeType?: string;
  maxValue?: number;
  date: string;
  comment?: string;
}

export interface HomeworkFormData {
  classId: number; // Group id (Int)
  subjectId: string;
  title: string;
  description?: string;
  dueDate: string;
  maxPoints?: number;
}

export interface ScheduleItemFormData {
  classId: number; // Group id (Int)
  subjectId: string;
  teacherId?: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room?: string;
}

export interface AttendanceRecord {
  studentId: string;
  status: string;
  note?: string;
}
