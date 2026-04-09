// src/lib/exams-api.ts
// API клиент для работы с контрольными

import { api } from "./api";
import type {
  Exam,
  ExamFormData,
  ExamQuestion,
  ExamQuestionFormData,
  ExamSubmission,
  PublicExam,
  ExamStartResponse,
  ExamSubmitData,
  ExamResult,
} from "../types/exam";

const EXAMS_BASE = "/exams";
const PUBLIC_EXAMS_BASE = "/public/exams";

// ============================================================================
// ЗАЩИЩЁННЫЕ API (для учителей/админов)
// ============================================================================
export const examsApi = {
  // Получить список контрольных текущего пользователя
  async getExams(params?: {
    status?: string;
    subject?: string;
    page?: number;
    limit?: number;
  }): Promise<Exam[]> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.subject) searchParams.set("subject", params.subject);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString();
    return api.get(`${EXAMS_BASE}${query ? `?${query}` : ""}`);
  },

  // Получить контрольную по ID
  async getExam(id: string): Promise<Exam> {
    return api.get(`${EXAMS_BASE}/${id}`);
  },

  // Создать контрольную
  async createExam(data: ExamFormData): Promise<Exam> {
    return api.post(EXAMS_BASE, data);
  },

  // Обновить контрольную
  async updateExam(id: string, data: Partial<ExamFormData>): Promise<Exam> {
    return api.put(`${EXAMS_BASE}/${id}`, data);
  },

  // Удалить контрольную
  async deleteExam(id: string): Promise<{ success: boolean }> {
    return api.delete(`${EXAMS_BASE}/${id}`);
  },

  // Добавить вопросы
  async addQuestions(examId: string, questions: ExamQuestionFormData[]): Promise<ExamQuestion[]> {
    return api.post(`${EXAMS_BASE}/${examId}/questions`, { questions });
  },

  // Обновить вопрос
  async updateQuestion(examId: string, questionId: string, data: Partial<ExamQuestionFormData>): Promise<ExamQuestion> {
    return api.put(`${EXAMS_BASE}/${examId}/questions/${questionId}`, data);
  },

  // Удалить вопрос
  async deleteQuestion(examId: string, questionId: string): Promise<{ success: boolean }> {
    return api.delete(`${EXAMS_BASE}/${examId}/questions/${questionId}`);
  },

  // Изменить порядок вопросов
  async reorderQuestions(examId: string, questionIds: string[]): Promise<{ success: boolean }> {
    return api.put(`${EXAMS_BASE}/${examId}/questions/reorder`, { questionIds });
  },

  // Опубликовать контрольную
  async publishExam(id: string): Promise<Exam> {
    return api.post(`${EXAMS_BASE}/${id}/publish`, {});
  },

  // Закрыть контрольную
  async closeExam(id: string): Promise<Exam> {
    return api.post(`${EXAMS_BASE}/${id}/close`, {});
  },

  // Получить результаты прохождения
  async getResults(examId: string): Promise<{
    exam: Exam;
    submissions: ExamSubmission[];
    stats: {
      total: number;
      completed: number;
      passed: number;
      avgScore: number;
      avgPercentage: number;
    };
  }> {
    return api.get(`${EXAMS_BASE}/${examId}/results`);
  },

  // Ручная оценка ответа
  async gradeAnswer(answerId: string, data: {
    score: number;
    feedback?: string;
  }): Promise<{ success: boolean }> {
    return api.post(`${EXAMS_BASE}/answers/${answerId}/grade`, data);
  },

  // Получить детальный результат прохождения
  async getSubmission(examId: string, submissionId: string): Promise<ExamSubmission> {
    return api.get(`${EXAMS_BASE}/${examId}/submissions/${submissionId}`);
  },
};

// ============================================================================
// ПУБЛИЧНЫЕ API (для студентов, без авторизации)
// ============================================================================
export const publicExamsApi = {
  // Получить контрольную по публичному токену
  async getExam(token: string): Promise<PublicExam> {
    return api.get(`${PUBLIC_EXAMS_BASE}/${token}`);
  },

  // Начать прохождение
  async startExam(token: string, data: {
    studentName: string;
    studentClass?: string;
    studentEmail?: string;
  }): Promise<ExamStartResponse> {
    return api.post(`${PUBLIC_EXAMS_BASE}/${token}/start`, data);
  },

  // Отправить ответы
  async submitExam(token: string, data: ExamSubmitData): Promise<ExamResult> {
    return api.post(`${PUBLIC_EXAMS_BASE}/${token}/submit`, data);
  },

  // Получить результат по ID прохождения
  async getResult(submissionId: string): Promise<any> {
    return api.get(`${PUBLIC_EXAMS_BASE}/result/${submissionId}`);
  },
};
