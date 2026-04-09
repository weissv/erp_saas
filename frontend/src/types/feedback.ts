// Feedback types
export type FeedbackStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED';
export type BugSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Feedback {
  id: number;
  parentName: string;
  contactInfo: string;
  type: string;
  message: string;
  response: string | null;
  status: FeedbackStatus;
  createdAt: string;
  resolvedAt: string | null;
}

export interface CreateBugReportPayload {
  title: string;
  severity: BugSeverity;
  pageUrl?: string;
  expectedBehavior?: string;
  actualBehavior: string;
  stepsToReproduce?: string;
  browserInfo?: string;
}
