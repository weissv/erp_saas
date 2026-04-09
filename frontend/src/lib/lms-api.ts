// src/lib/lms-api.ts
import { api } from "./api";
import type {
  // School types
  LmsSchoolClass,
  LmsSchoolStudent,
  LmsSubject,
  LmsScheduleItem,
  LmsGrade,
  LmsHomework,
  LmsHomeworkSubmission,
  LmsStudentAttendance,
  LmsClassAnnouncement,
  GradebookData,
  SchoolStats,
  SchoolClassFormData,
  StudentFormData,
  GradeFormData,
  HomeworkFormData,
  ScheduleItemFormData,
  AttendanceRecord,
} from "../types/lms";

const LMS_BASE = "/lms";

export const lmsApi = {
  // ============================================================================
  // ШКОЛЬНАЯ LMS
  // ============================================================================

  // Классы (используют ERP Group)
  async getClasses(params?: { academicYear?: string; grade?: number; isActive?: boolean }): Promise<LmsSchoolClass[]> {
    const searchParams = new URLSearchParams();
    if (params?.academicYear) searchParams.set("academicYear", params.academicYear);
    if (params?.grade) searchParams.set("grade", String(params.grade));
    if (params?.isActive !== undefined) searchParams.set("isActive", String(params.isActive));
    const query = searchParams.toString();
    return api.get(`${LMS_BASE}/school/classes${query ? `?${query}` : ""}`);
  },

  async getClass(id: number): Promise<LmsSchoolClass> {
    return api.get(`${LMS_BASE}/school/classes/${id}`);
  },

  async createClass(data: SchoolClassFormData): Promise<LmsSchoolClass> {
    return api.post(`${LMS_BASE}/school/classes`, data);
  },

  async updateClass(id: number, data: Partial<SchoolClassFormData>): Promise<LmsSchoolClass> {
    return api.put(`${LMS_BASE}/school/classes/${id}`, data);
  },

  async deleteClass(id: number): Promise<{ success: boolean }> {
    return api.delete(`${LMS_BASE}/school/classes/${id}`);
  },

  // Ученики
  async getStudents(classId: number): Promise<LmsSchoolStudent[]> {
    return api.get(`${LMS_BASE}/school/classes/${classId}/students`);
  },

  async createStudent(data: StudentFormData): Promise<LmsSchoolStudent> {
    return api.post(`${LMS_BASE}/school/students`, data);
  },

  async updateStudent(id: string, data: Partial<StudentFormData>): Promise<LmsSchoolStudent> {
    return api.put(`${LMS_BASE}/school/students/${id}`, data);
  },

  // Предметы
  async getSubjects(): Promise<LmsSubject[]> {
    return api.get(`${LMS_BASE}/school/subjects`);
  },

  async createSubject(data: { name: string; description?: string; grade?: number; hoursPerWeek?: number }): Promise<LmsSubject> {
    return api.post(`${LMS_BASE}/school/subjects`, data);
  },

  // Расписание
  async getSchedule(params?: { classId?: number; teacherId?: number; dayOfWeek?: number }): Promise<LmsScheduleItem[]> {
    const searchParams = new URLSearchParams();
    if (params?.classId) searchParams.set("classId", String(params.classId));
    if (params?.teacherId) searchParams.set("teacherId", String(params.teacherId));
    if (params?.dayOfWeek) searchParams.set("dayOfWeek", String(params.dayOfWeek));
    const query = searchParams.toString();
    return api.get(`${LMS_BASE}/school/schedule${query ? `?${query}` : ""}`);
  },

  async createScheduleItem(data: ScheduleItemFormData): Promise<LmsScheduleItem> {
    return api.post(`${LMS_BASE}/school/schedule`, data);
  },

  async updateScheduleItem(id: string, data: Partial<ScheduleItemFormData>): Promise<LmsScheduleItem> {
    return api.put(`${LMS_BASE}/school/schedule/${id}`, data);
  },

  async deleteScheduleItem(id: string): Promise<{ success: boolean }> {
    return api.delete(`${LMS_BASE}/school/schedule/${id}`);
  },

  // Оценки
  async getGrades(params?: { classId?: number; subjectId?: string; studentId?: string; startDate?: string; endDate?: string }): Promise<LmsGrade[]> {
    const searchParams = new URLSearchParams();
    if (params?.classId) searchParams.set("classId", String(params.classId));
    if (params?.subjectId) searchParams.set("subjectId", params.subjectId);
    if (params?.studentId) searchParams.set("studentId", params.studentId);
    if (params?.startDate) searchParams.set("startDate", params.startDate);
    if (params?.endDate) searchParams.set("endDate", params.endDate);
    const query = searchParams.toString();
    return api.get(`${LMS_BASE}/school/grades${query ? `?${query}` : ""}`);
  },

  async getGradebook(classId: number, subjectId: string, params?: { startDate?: string; endDate?: string }): Promise<GradebookData> {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set("startDate", params.startDate);
    if (params?.endDate) searchParams.set("endDate", params.endDate);
    const query = searchParams.toString();
    return api.get(`${LMS_BASE}/school/gradebook/${classId}/${subjectId}${query ? `?${query}` : ""}`);
  },

  async createGrade(data: GradeFormData): Promise<LmsGrade> {
    return api.post(`${LMS_BASE}/school/grades`, data);
  },

  async updateGrade(id: string, data: Partial<GradeFormData>): Promise<LmsGrade> {
    return api.put(`${LMS_BASE}/school/grades/${id}`, data);
  },

  async deleteGrade(id: string): Promise<{ success: boolean }> {
    return api.delete(`${LMS_BASE}/school/grades/${id}`);
  },

  // Домашние задания
  async getHomework(params?: { classId?: number; subjectId?: string; startDate?: string; endDate?: string }): Promise<LmsHomework[]> {
    const searchParams = new URLSearchParams();
    if (params?.classId) searchParams.set("classId", String(params.classId));
    if (params?.subjectId) searchParams.set("subjectId", params.subjectId);
    if (params?.startDate) searchParams.set("startDate", params.startDate);
    if (params?.endDate) searchParams.set("endDate", params.endDate);
    const query = searchParams.toString();
    return api.get(`${LMS_BASE}/school/homework${query ? `?${query}` : ""}`);
  },

  async createHomework(data: HomeworkFormData): Promise<LmsHomework> {
    return api.post(`${LMS_BASE}/school/homework`, data);
  },

  async updateHomework(id: string, data: Partial<HomeworkFormData>): Promise<LmsHomework> {
    return api.put(`${LMS_BASE}/school/homework/${id}`, data);
  },

  async deleteHomework(id: string): Promise<{ success: boolean }> {
    return api.delete(`${LMS_BASE}/school/homework/${id}`);
  },

  async getHomeworkSubmissions(homeworkId: string): Promise<LmsHomeworkSubmission[]> {
    return api.get(`${LMS_BASE}/school/homework/${homeworkId}/submissions`);
  },

  async gradeHomeworkSubmission(submissionId: string, data: { points: number; feedback?: string }): Promise<LmsHomeworkSubmission> {
    return api.put(`${LMS_BASE}/school/homework/submissions/${submissionId}/grade`, data);
  },

  // Посещаемость
  async getAttendance(params?: { classId?: number; studentId?: string; date?: string; startDate?: string; endDate?: string }): Promise<LmsStudentAttendance[]> {
    const searchParams = new URLSearchParams();
    if (params?.classId) searchParams.set("classId", String(params.classId));
    if (params?.studentId) searchParams.set("studentId", params.studentId);
    if (params?.date) searchParams.set("date", params.date);
    if (params?.startDate) searchParams.set("startDate", params.startDate);
    if (params?.endDate) searchParams.set("endDate", params.endDate);
    const query = searchParams.toString();
    return api.get(`${LMS_BASE}/school/attendance${query ? `?${query}` : ""}`);
  },

  async recordAttendance(date: string, classId: number, records: AttendanceRecord[]): Promise<LmsStudentAttendance[]> {
    return api.post(`${LMS_BASE}/school/attendance/bulk`, { date, classId, records });
  },

  // Объявления
  async getAnnouncements(classId?: number): Promise<LmsClassAnnouncement[]> {
    const query = classId ? `?classId=${classId}` : "";
    return api.get(`${LMS_BASE}/school/announcements${query}`);
  },

  async createAnnouncement(data: { classId?: number; title: string; content: string; isPinned?: boolean }): Promise<LmsClassAnnouncement> {
    return api.post(`${LMS_BASE}/school/announcements`, data);
  },

  // Статистика школы
  async getSchoolStats(): Promise<SchoolStats> {
    return api.get(`${LMS_BASE}/school/school-stats`);
  },
};

export default lmsApi;
