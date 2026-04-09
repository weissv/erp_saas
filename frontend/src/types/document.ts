// Document types
export interface DocumentTemplate {
  id: number;
  name: string;
  content: string;
  createdAt: string;
}

export interface Document {
  id: number;
  name: string;
  fileUrl: string;
  templateId: number | null;
  employeeId: number | null;
  childId: number | null;
  createdAt: string;
  template?: DocumentTemplate;
  employee?: { id: number; firstName: string; lastName: string };
  child?: { id: number; firstName: string; lastName: string };
}
