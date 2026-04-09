// src/types/exam.ts
// Типы для системы контрольных/экзаменов

export type ExamQuestionType =
  | "MULTIPLE_CHOICE"
  | "SINGLE_CHOICE"
  | "TEXT_SHORT"
  | "TEXT_LONG"
  | "PROBLEM"
  | "TRUE_FALSE";

export type ExamStatus = "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";

export interface Exam {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  status: ExamStatus;
  timeLimit: number | null;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResults: boolean;
  passingScore: number;
  startDate: string | null;
  endDate: string | null;
  publicToken: string;
  publicUrl?: string;
  creatorId: string;
  creator?: {
    id: string;
    fullName: string;
  };
  questions?: ExamQuestion[];
  targetGroups?: ExamTargetGroup[];
  _count?: {
    questions: number;
    submissions: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ExamQuestion {
  id: string;
  examId: string;
  orderIndex: number;
  type: ExamQuestionType;
  content: string;
  imageUrl: string | null;
  options: string[] | null;
  correctAnswer: any;
  expectedAnswer: string | null;
  keyPoints: string[] | null;
  explanation: string | null;
  points: number;
  partialCredit: boolean;
  createdAt: string;
}

export interface ExamTargetGroup {
  id: string;
  examId: string;
  groupId: number;
  group?: {
    id: number;
    name: string;
  };
}

export interface ExamSubmission {
  id: string;
  examId: string;
  studentId: string | null;
  studentName: string;
  studentClass: string | null;
  studentEmail: string | null;
  startedAt: string;
  submittedAt: string | null;
  totalScore: number | null;
  maxScore: number;
  percentage: number | null;
  passed: boolean | null;
  aiReviewCompleted: boolean;
  manualReviewCompleted: boolean;
  answers?: ExamAnswer[];
}

export interface ExamAnswer {
  id: string;
  submissionId: string;
  questionId: string;
  question?: ExamQuestion;
  answer: string | null;
  score: number | null;
  maxScore: number;
  isCorrect: boolean | null;
  aiScore: number | null;
  aiFeedback: string | null;
  aiChecked: boolean;
  manualScore: number | null;
  manualFeedback: string | null;
  manualChecked: boolean;
}

// Формы для создания/редактирования
export interface ExamFormData {
  title: string;
  description?: string;
  subject?: string;
  timeLimit?: number | null;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  showResults?: boolean;
  passingScore?: number;
  startDate?: string | null;
  endDate?: string | null;
  targetGroupIds?: number[];
}

export interface ExamQuestionFormData {
  type: ExamQuestionType;
  content: string;
  imageUrl?: string;
  options?: string[];
  correctAnswer?: any;
  expectedAnswer?: string;
  keyPoints?: string[];
  explanation?: string;
  points?: number;
  partialCredit?: boolean;
}

// Публичные типы для студентов
export interface PublicExam {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  timeLimit: number | null;
  totalQuestions: number;
  totalPoints: number;
  questions: PublicExamQuestion[];
}

export interface PublicExamQuestion {
  id: string;
  orderIndex: number;
  type: ExamQuestionType;
  content: string;
  imageUrl: string | null;
  options: string[] | null;
  points: number;
}

export interface ExamStartResponse {
  submissionId: string;
  startedAt: string;
  timeLimit: number | null;
}

export interface ExamSubmitData {
  submissionId: string;
  answers: Array<{
    questionId: string;
    answer: string | string[] | boolean;
  }>;
}

export interface ExamResult {
  message: string;
  result?: {
    totalScore: number;
    maxScore: number;
    percentage: number;
    passed: boolean;
    answers: Array<{
      questionId: string;
      content: string;
      type: ExamQuestionType;
      yourAnswer: string;
      isCorrect: boolean | null;
      score: number;
      maxScore: number;
      explanation?: string;
      needsAiReview: boolean;
    }>;
  };
  pendingAiReview?: boolean;
  submissionId?: string;
}
