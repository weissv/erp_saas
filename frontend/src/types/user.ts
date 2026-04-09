import type { Role } from './common';

export interface User {
  id: number;
  email: string;
  role: Role;
  employeeId: number;
  telegramChatId?: string | null;
  deletedAt?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: number;
    firstName: string;
    lastName: string;
    position: string;
  };
}

export interface AvailableEmployee {
  id: number;
  firstName: string;
  lastName: string;
  position: string;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  role: User['role'];
  employeeId: number;
}

export interface UpdateUserPayload {
  email?: string;
  password?: string;
  role?: User['role'];
}
