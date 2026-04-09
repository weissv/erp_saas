// src/types/child.ts
// Единый источник типов для модуля «Дети»

import { BaseEntity, ChildStatus } from './common';

// ===== Справочники =====

export type Gender = 'MALE' | 'FEMALE';

export interface Group {
  id: number;
  name: string;
  grade?: number | null;
  capacity?: number;
  academicYear?: string | null;
}

// ===== Parent =====

export interface Parent {
  id: number;
  fullName: string;
  relation: string;
  phone?: string | null;
  email?: string | null;
  workplace?: string | null;
}

export interface ParentInput {
  id?: number;
  fullName: string;
  relation: string;
  phone?: string;
  email?: string;
  workplace?: string;
}

// ===== Health Info =====

export interface HealthInfo {
  allergies?: string[];
  specialConditions?: string[];
  medications?: string[];
  notes?: string;
}

// ===== Child — list item =====

export interface Child extends BaseEntity {
  firstName: string;
  lastName: string;
  middleName?: string | null;
  birthDate: string;
  groupId: number;
  group: Group;
  healthInfo?: HealthInfo | null;
  status: ChildStatus;
  address?: string | null;
  nationality?: string | null;
  gender?: Gender | null;
  birthCertificateNumber?: string | null;
  contractNumber?: string | null;
  contractDate?: string | null;
  parents: Parent[];
  // Legacy fields (backward compat)
  fatherName?: string | null;
  motherName?: string | null;
  parentPhone?: string | null;
}

// ===== Child — detail page =====

export interface ClubEnrollmentSummary {
  id: number;
  clubId: number;
  status: string;
  club: { id: number; name: string };
}

export interface ChildDetail extends Child {
  temporaryAbsences?: TemporaryAbsence[];
  enrollments?: ClubEnrollmentSummary[];
}

// ===== Temporary Absences =====

export interface TemporaryAbsence {
  id: number;
  childId: number;
  startDate: string;
  endDate: string;
  reason?: string | null;
  createdAt: string;
}

export interface CreateAbsenceInput {
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface UpdateAbsenceInput extends Partial<CreateAbsenceInput> {}

// ===== Create/Update DTOs =====

export interface CreateChildInput {
  firstName: string;
  lastName: string;
  middleName?: string;
  birthDate: string;
  groupId: number;
  healthInfo?: HealthInfo;
  address?: string;
  nationality?: string;
  gender?: Gender;
  birthCertificateNumber?: string;
  contractNumber?: string;
  contractDate?: string;
  parents?: ParentInput[];
  // Legacy
  fatherName?: string;
  motherName?: string;
  parentPhone?: string;
}

export interface UpdateChildInput extends Partial<CreateChildInput> {}

// ===== Filters =====

export interface ChildFilters {
  status?: ChildStatus;
  groupId?: number;
  search?: string;
  gender?: Gender;
}
