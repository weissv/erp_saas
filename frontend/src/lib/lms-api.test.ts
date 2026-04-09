// src/lib/lms-api.test.ts
// Unit тесты для LMS API модуля

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { lmsApi } from './lms-api';

// Мок для api модуля
vi.mock('./api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { api } from './api';

// Мок данные
const mockClass = {
  id: 1,
  name: '5А',
  grade: 5,
  academicYear: '2024-2025',
  isActive: true,
  homeroomTeacherId: 1,
  students: [],
};

const mockStudent = {
  id: 'student-1',
  firstName: 'Иван',
  lastName: 'Иванов',
  classId: 1,
  enrollmentDate: '2024-09-01',
};

const mockSubject = {
  id: 'subject-1',
  name: 'Математика',
  description: 'Алгебра и геометрия',
  grade: 5,
  hoursPerWeek: 5,
};

const mockScheduleItem = {
  id: 'schedule-1',
  classId: 1,
  subjectId: 'subject-1',
  teacherId: 1,
  dayOfWeek: 1,
  startTime: '08:00',
  endTime: '08:45',
  room: '101',
};

const mockGrade = {
  id: 'grade-1',
  studentId: 'student-1',
  subjectId: 'subject-1',
  classId: 1,
  value: 5,
  type: 'homework',
  date: '2024-10-15',
  comment: 'Отлично',
};

const mockHomework = {
  id: 'homework-1',
  classId: 1,
  subjectId: 'subject-1',
  title: 'Домашнее задание №1',
  description: 'Решить задачи 1-5',
  dueDate: '2024-10-20',
  maxPoints: 10,
};

const mockAttendance = {
  id: 'attendance-1',
  studentId: 'student-1',
  classId: 1,
  date: '2024-10-15',
  status: 'present',
};

const mockAnnouncement = {
  id: 'announcement-1',
  classId: 1,
  title: 'Родительское собрание',
  content: 'Состоится в пятницу в 18:00',
  isPinned: true,
  createdAt: '2024-10-15',
};

const mockGradebook = {
  students: [mockStudent],
  subjects: [mockSubject],
  grades: [mockGrade],
  dates: ['2024-10-15'],
};

const mockSchoolStats = {
  totalStudents: 500,
  totalClasses: 20,
  totalTeachers: 30,
  averageAttendance: 95.5,
};

describe('lmsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Классы', () => {
    describe('getClasses', () => {
      it('получает список классов без параметров', async () => {
        vi.mocked(api.get).mockResolvedValue([mockClass]);

        const result = await lmsApi.getClasses();

        expect(api.get).toHaveBeenCalledWith('/lms/school/classes');
        expect(result).toEqual([mockClass]);
      });

      it('получает список классов с параметрами academicYear', async () => {
        vi.mocked(api.get).mockResolvedValue([mockClass]);

        await lmsApi.getClasses({ academicYear: '2024-2025' });

        expect(api.get).toHaveBeenCalledWith('/lms/school/classes?academicYear=2024-2025');
      });

      it('получает список классов с параметрами grade', async () => {
        vi.mocked(api.get).mockResolvedValue([mockClass]);

        await lmsApi.getClasses({ grade: 5 });

        expect(api.get).toHaveBeenCalledWith('/lms/school/classes?grade=5');
      });

      it('получает список классов с параметрами isActive', async () => {
        vi.mocked(api.get).mockResolvedValue([mockClass]);

        await lmsApi.getClasses({ isActive: true });

        expect(api.get).toHaveBeenCalledWith('/lms/school/classes?isActive=true');
      });

      it('получает список классов с несколькими параметрами', async () => {
        vi.mocked(api.get).mockResolvedValue([mockClass]);

        await lmsApi.getClasses({ academicYear: '2024-2025', grade: 5, isActive: true });

        const call = vi.mocked(api.get).mock.calls[0][0];
        expect(call).toContain('/lms/school/classes?');
        expect(call).toContain('academicYear=2024-2025');
        expect(call).toContain('grade=5');
        expect(call).toContain('isActive=true');
      });
    });

    describe('getClass', () => {
      it('получает один класс по id', async () => {
        vi.mocked(api.get).mockResolvedValue(mockClass);

        const result = await lmsApi.getClass(1);

        expect(api.get).toHaveBeenCalledWith('/lms/school/classes/1');
        expect(result).toEqual(mockClass);
      });
    });

    describe('createClass', () => {
      it('создаёт новый класс', async () => {
        vi.mocked(api.post).mockResolvedValue(mockClass);

        const data = { name: '5А', grade: 5, academicYear: '2024-2025' };
        const result = await lmsApi.createClass(data);

        expect(api.post).toHaveBeenCalledWith('/lms/school/classes', data);
        expect(result).toEqual(mockClass);
      });
    });

    describe('updateClass', () => {
      it('обновляет класс', async () => {
        const updatedClass = { ...mockClass, name: '5Б' };
        vi.mocked(api.put).mockResolvedValue(updatedClass);

        const result = await lmsApi.updateClass(1, { name: '5Б' });

        expect(api.put).toHaveBeenCalledWith('/lms/school/classes/1', { name: '5Б' });
        expect(result).toEqual(updatedClass);
      });
    });

    describe('deleteClass', () => {
      it('удаляет класс', async () => {
        vi.mocked(api.delete).mockResolvedValue({ success: true });

        const result = await lmsApi.deleteClass(1);

        expect(api.delete).toHaveBeenCalledWith('/lms/school/classes/1');
        expect(result).toEqual({ success: true });
      });
    });
  });

  describe('Ученики', () => {
    describe('getStudents', () => {
      it('получает список учеников класса', async () => {
        vi.mocked(api.get).mockResolvedValue([mockStudent]);

        const result = await lmsApi.getStudents(1);

        expect(api.get).toHaveBeenCalledWith('/lms/school/classes/1/students');
        expect(result).toEqual([mockStudent]);
      });
    });

    describe('createStudent', () => {
      it('создаёт нового ученика', async () => {
        vi.mocked(api.post).mockResolvedValue(mockStudent);

        const data = { firstName: 'Иван', lastName: 'Иванов', classId: 1, enrollmentDate: '2024-09-01' };
        const result = await lmsApi.createStudent(data);

        expect(api.post).toHaveBeenCalledWith('/lms/school/students', data);
        expect(result).toEqual(mockStudent);
      });
    });

    describe('updateStudent', () => {
      it('обновляет ученика', async () => {
        const updatedStudent = { ...mockStudent, firstName: 'Пётр' };
        vi.mocked(api.put).mockResolvedValue(updatedStudent);

        const result = await lmsApi.updateStudent('student-1', { firstName: 'Пётр' });

        expect(api.put).toHaveBeenCalledWith('/lms/school/students/student-1', { firstName: 'Пётр' });
        expect(result).toEqual(updatedStudent);
      });
    });
  });

  describe('Предметы', () => {
    describe('getSubjects', () => {
      it('получает список предметов', async () => {
        vi.mocked(api.get).mockResolvedValue([mockSubject]);

        const result = await lmsApi.getSubjects();

        expect(api.get).toHaveBeenCalledWith('/lms/school/subjects');
        expect(result).toEqual([mockSubject]);
      });
    });

    describe('createSubject', () => {
      it('создаёт новый предмет', async () => {
        vi.mocked(api.post).mockResolvedValue(mockSubject);

        const data = { name: 'Математика', description: 'Алгебра и геометрия' };
        const result = await lmsApi.createSubject(data);

        expect(api.post).toHaveBeenCalledWith('/lms/school/subjects', data);
        expect(result).toEqual(mockSubject);
      });
    });
  });

  describe('Расписание', () => {
    describe('getSchedule', () => {
      it('получает расписание без параметров', async () => {
        vi.mocked(api.get).mockResolvedValue([mockScheduleItem]);

        const result = await lmsApi.getSchedule();

        expect(api.get).toHaveBeenCalledWith('/lms/school/schedule');
        expect(result).toEqual([mockScheduleItem]);
      });

      it('получает расписание с параметрами classId', async () => {
        vi.mocked(api.get).mockResolvedValue([mockScheduleItem]);

        await lmsApi.getSchedule({ classId: 1 });

        expect(api.get).toHaveBeenCalledWith('/lms/school/schedule?classId=1');
      });

      it('получает расписание с параметрами teacherId', async () => {
        vi.mocked(api.get).mockResolvedValue([mockScheduleItem]);

        await lmsApi.getSchedule({ teacherId: 1 });

        expect(api.get).toHaveBeenCalledWith('/lms/school/schedule?teacherId=1');
      });

      it('получает расписание с параметрами dayOfWeek', async () => {
        vi.mocked(api.get).mockResolvedValue([mockScheduleItem]);

        await lmsApi.getSchedule({ dayOfWeek: 1 });

        expect(api.get).toHaveBeenCalledWith('/lms/school/schedule?dayOfWeek=1');
      });
    });

    describe('createScheduleItem', () => {
      it('создаёт элемент расписания', async () => {
        vi.mocked(api.post).mockResolvedValue(mockScheduleItem);

        const data = { classId: 1, subjectId: 'subject-1', teacherId: 1, dayOfWeek: 1, startTime: '08:00', endTime: '08:45', room: '101' };
        const result = await lmsApi.createScheduleItem(data);

        expect(api.post).toHaveBeenCalledWith('/lms/school/schedule', data);
        expect(result).toEqual(mockScheduleItem);
      });
    });

    describe('updateScheduleItem', () => {
      it('обновляет элемент расписания', async () => {
        const updated = { ...mockScheduleItem, room: '102' };
        vi.mocked(api.put).mockResolvedValue(updated);

        const result = await lmsApi.updateScheduleItem('schedule-1', { room: '102' });

        expect(api.put).toHaveBeenCalledWith('/lms/school/schedule/schedule-1', { room: '102' });
        expect(result).toEqual(updated);
      });
    });

    describe('deleteScheduleItem', () => {
      it('удаляет элемент расписания', async () => {
        vi.mocked(api.delete).mockResolvedValue({ success: true });

        const result = await lmsApi.deleteScheduleItem('schedule-1');

        expect(api.delete).toHaveBeenCalledWith('/lms/school/schedule/schedule-1');
        expect(result).toEqual({ success: true });
      });
    });
  });

  describe('Оценки', () => {
    describe('getGrades', () => {
      it('получает оценки без параметров', async () => {
        vi.mocked(api.get).mockResolvedValue([mockGrade]);

        const result = await lmsApi.getGrades();

        expect(api.get).toHaveBeenCalledWith('/lms/school/grades');
        expect(result).toEqual([mockGrade]);
      });

      it('получает оценки с фильтрами', async () => {
        vi.mocked(api.get).mockResolvedValue([mockGrade]);

        await lmsApi.getGrades({ classId: 1, subjectId: 'subject-1', studentId: 'student-1' });

        const call = vi.mocked(api.get).mock.calls[0][0];
        expect(call).toContain('classId=1');
        expect(call).toContain('subjectId=subject-1');
        expect(call).toContain('studentId=student-1');
      });

      it('получает оценки с диапазоном дат', async () => {
        vi.mocked(api.get).mockResolvedValue([mockGrade]);

        await lmsApi.getGrades({ startDate: '2024-10-01', endDate: '2024-10-31' });

        const call = vi.mocked(api.get).mock.calls[0][0];
        expect(call).toContain('startDate=2024-10-01');
        expect(call).toContain('endDate=2024-10-31');
      });
    });

    describe('getGradebook', () => {
      it('получает журнал оценок', async () => {
        vi.mocked(api.get).mockResolvedValue(mockGradebook);

        const result = await lmsApi.getGradebook(1, 'subject-1');

        expect(api.get).toHaveBeenCalledWith('/lms/school/gradebook/1/subject-1');
        expect(result).toEqual(mockGradebook);
      });

      it('получает журнал оценок с диапазоном дат', async () => {
        vi.mocked(api.get).mockResolvedValue(mockGradebook);

        await lmsApi.getGradebook(1, 'subject-1', { startDate: '2024-10-01', endDate: '2024-10-31' });

        const call = vi.mocked(api.get).mock.calls[0][0];
        expect(call).toContain('startDate=2024-10-01');
        expect(call).toContain('endDate=2024-10-31');
      });
    });

    describe('createGrade', () => {
      it('создаёт оценку', async () => {
        vi.mocked(api.post).mockResolvedValue(mockGrade);

        const data = { studentId: 'student-1', subjectId: 'subject-1', classId: 1, value: 5, type: 'homework', date: '2024-10-15' };
        const result = await lmsApi.createGrade(data);

        expect(api.post).toHaveBeenCalledWith('/lms/school/grades', data);
        expect(result).toEqual(mockGrade);
      });
    });

    describe('updateGrade', () => {
      it('обновляет оценку', async () => {
        const updated = { ...mockGrade, value: 4 };
        vi.mocked(api.put).mockResolvedValue(updated);

        const result = await lmsApi.updateGrade('grade-1', { value: 4 });

        expect(api.put).toHaveBeenCalledWith('/lms/school/grades/grade-1', { value: 4 });
        expect(result).toEqual(updated);
      });
    });

    describe('deleteGrade', () => {
      it('удаляет оценку', async () => {
        vi.mocked(api.delete).mockResolvedValue({ success: true });

        const result = await lmsApi.deleteGrade('grade-1');

        expect(api.delete).toHaveBeenCalledWith('/lms/school/grades/grade-1');
        expect(result).toEqual({ success: true });
      });
    });
  });

  describe('Домашние задания', () => {
    describe('getHomework', () => {
      it('получает домашние задания без параметров', async () => {
        vi.mocked(api.get).mockResolvedValue([mockHomework]);

        const result = await lmsApi.getHomework();

        expect(api.get).toHaveBeenCalledWith('/lms/school/homework');
        expect(result).toEqual([mockHomework]);
      });

      it('получает домашние задания с фильтрами', async () => {
        vi.mocked(api.get).mockResolvedValue([mockHomework]);

        await lmsApi.getHomework({ classId: 1, subjectId: 'subject-1' });

        const call = vi.mocked(api.get).mock.calls[0][0];
        expect(call).toContain('classId=1');
        expect(call).toContain('subjectId=subject-1');
      });
    });

    describe('createHomework', () => {
      it('создаёт домашнее задание', async () => {
        vi.mocked(api.post).mockResolvedValue(mockHomework);

        const data = { classId: 1, subjectId: 'subject-1', title: 'ДЗ', description: 'Решить', dueDate: '2024-10-20' };
        const result = await lmsApi.createHomework(data);

        expect(api.post).toHaveBeenCalledWith('/lms/school/homework', data);
        expect(result).toEqual(mockHomework);
      });
    });

    describe('updateHomework', () => {
      it('обновляет домашнее задание', async () => {
        const updated = { ...mockHomework, title: 'Новое ДЗ' };
        vi.mocked(api.put).mockResolvedValue(updated);

        const result = await lmsApi.updateHomework('homework-1', { title: 'Новое ДЗ' });

        expect(api.put).toHaveBeenCalledWith('/lms/school/homework/homework-1', { title: 'Новое ДЗ' });
        expect(result).toEqual(updated);
      });
    });

    describe('deleteHomework', () => {
      it('удаляет домашнее задание', async () => {
        vi.mocked(api.delete).mockResolvedValue({ success: true });

        const result = await lmsApi.deleteHomework('homework-1');

        expect(api.delete).toHaveBeenCalledWith('/lms/school/homework/homework-1');
        expect(result).toEqual({ success: true });
      });
    });

    describe('getHomeworkSubmissions', () => {
      it('получает сдачи домашнего задания', async () => {
        const submissions = [{ id: 'sub-1', homeworkId: 'homework-1', studentId: 'student-1' }];
        vi.mocked(api.get).mockResolvedValue(submissions);

        const result = await lmsApi.getHomeworkSubmissions('homework-1');

        expect(api.get).toHaveBeenCalledWith('/lms/school/homework/homework-1/submissions');
        expect(result).toEqual(submissions);
      });
    });

    describe('gradeHomeworkSubmission', () => {
      it('оценивает сдачу домашнего задания', async () => {
        const graded = { id: 'sub-1', points: 9, feedback: 'Хорошо!' };
        vi.mocked(api.put).mockResolvedValue(graded);

        const result = await lmsApi.gradeHomeworkSubmission('sub-1', { points: 9, feedback: 'Хорошо!' });

        expect(api.put).toHaveBeenCalledWith('/lms/school/homework/submissions/sub-1/grade', { points: 9, feedback: 'Хорошо!' });
        expect(result).toEqual(graded);
      });
    });
  });

  describe('Посещаемость', () => {
    describe('getAttendance', () => {
      it('получает посещаемость без параметров', async () => {
        vi.mocked(api.get).mockResolvedValue([mockAttendance]);

        const result = await lmsApi.getAttendance();

        expect(api.get).toHaveBeenCalledWith('/lms/school/attendance');
        expect(result).toEqual([mockAttendance]);
      });

      it('получает посещаемость с фильтрами', async () => {
        vi.mocked(api.get).mockResolvedValue([mockAttendance]);

        await lmsApi.getAttendance({ classId: 1, studentId: 'student-1', date: '2024-10-15' });

        const call = vi.mocked(api.get).mock.calls[0][0];
        expect(call).toContain('classId=1');
        expect(call).toContain('studentId=student-1');
        expect(call).toContain('date=2024-10-15');
      });
    });

    describe('recordAttendance', () => {
      it('записывает посещаемость', async () => {
        vi.mocked(api.post).mockResolvedValue([mockAttendance]);

        const records = [{ studentId: 'student-1', status: 'present' }];
        const result = await lmsApi.recordAttendance('2024-10-15', 1, records);

        expect(api.post).toHaveBeenCalledWith('/lms/school/attendance/bulk', {
          date: '2024-10-15',
          classId: 1,
          records,
        });
        expect(result).toEqual([mockAttendance]);
      });
    });
  });

  describe('Объявления', () => {
    describe('getAnnouncements', () => {
      it('получает все объявления', async () => {
        vi.mocked(api.get).mockResolvedValue([mockAnnouncement]);

        const result = await lmsApi.getAnnouncements();

        expect(api.get).toHaveBeenCalledWith('/lms/school/announcements');
        expect(result).toEqual([mockAnnouncement]);
      });

      it('получает объявления для класса', async () => {
        vi.mocked(api.get).mockResolvedValue([mockAnnouncement]);

        await lmsApi.getAnnouncements(1);

        expect(api.get).toHaveBeenCalledWith('/lms/school/announcements?classId=1');
      });
    });

    describe('createAnnouncement', () => {
      it('создаёт объявление', async () => {
        vi.mocked(api.post).mockResolvedValue(mockAnnouncement);

        const data = { classId: 1, title: 'Объявление', content: 'Текст', isPinned: true };
        const result = await lmsApi.createAnnouncement(data);

        expect(api.post).toHaveBeenCalledWith('/lms/school/announcements', data);
        expect(result).toEqual(mockAnnouncement);
      });
    });
  });

  describe('Статистика', () => {
    describe('getSchoolStats', () => {
      it('получает статистику школы', async () => {
        vi.mocked(api.get).mockResolvedValue(mockSchoolStats);

        const result = await lmsApi.getSchoolStats();

        expect(api.get).toHaveBeenCalledWith('/lms/school/school-stats');
        expect(result).toEqual(mockSchoolStats);
      });
    });
  });
});
