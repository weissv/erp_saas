// src/types/employee.ts
// Типы для сотрудников

import { BaseEntity, Role, EmployeeAttendanceStatus } from './common';

export interface Employee extends BaseEntity {
  firstName: string;
  lastName: string;
  middleName?: string | null;
  birthDate?: string | null;
  position: string;
  rate: number;
  hireDate: string;
  fireDate?: string | null;
  contractEndDate?: string | null;
  medicalCheckupDate?: string | null;
  attestationDate?: string | null;
  user?: EmployeeUser | null;
}

export interface EmployeeUser {
  id: number;
  email: string;
  role: Role;
}

export interface EmployeeWithDetails extends Employee {
  user: EmployeeUser | null;
  clubs?: EmployeeClub[];
  classGroups?: EmployeeGroup[];
}

export interface EmployeeClub {
  id: number;
  name: string;
}

export interface EmployeeGroup {
  id: number;
  name: string;
}

// Формы
export interface CreateEmployeeInput {
  firstName: string;
  lastName: string;
  middleName?: string;
  birthDate?: string;
  position: string;
  rate: number;
  hireDate: string;
  fireDate?: string;
  contractEndDate?: string;
  medicalCheckupDate?: string;
  attestationDate?: string;
  user?: {
    email: string;
    password: string;
    role: Role;
  };
}

export interface UpdateEmployeeInput extends Partial<Omit<CreateEmployeeInput, 'user'>> {}

// Посещаемость сотрудников
export interface EmployeeAttendance {
  id: number;
  employeeId: number;
  date: string;
  status: EmployeeAttendanceStatus;
  hoursWorked?: number | null;
  notes?: string | null;
  employee?: Pick<Employee, 'id' | 'firstName' | 'lastName'>;
}

// Напоминания
export interface EmployeeReminder {
  id: number;
  firstName: string;
  lastName: string;
  position: string;
  medicalCheckupDate?: string;
  attestationDate?: string;
  daysUntil: number;
}

export interface EmployeeReminders {
  medicalCheckups: EmployeeReminder[];
  attestations: EmployeeReminder[];
}

// Штатное расписание
export interface StaffingTableEntry {
  id: number;
  position: string;
  requiredRate: number;
  filledRate?: number;
  vacancy?: number;
}
