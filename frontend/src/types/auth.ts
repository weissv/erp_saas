// src/types/auth.ts
// Типы для аутентификации и авторизации

import { Role } from './common';

// Re-export Role for convenience
export type { Role } from './common';

export type UserRole = Role;

// Права доступа для роли
export interface RolePermission {
  id: number;
  role: UserRole;
  modules: string[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  customPermissions?: Record<string, boolean>;
}

// Текущий пользователь
export interface User {
  id: number;
  email: string;
  role: Role;
  employee?: UserEmployee | null;
}

export interface UserEmployee {
  id: number;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  position: string;
}

// Контекст аутентификации
export interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (roles: Role | Role[]) => boolean;
  hasPermission: (module: string, action?: 'create' | 'edit' | 'delete' | 'export') => boolean;
}

// Формы входа
export interface LoginFormData {
  login: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// Хранилище сессии
export interface StoredSession {
  token: string | null;
  user: User | null;
  expiresAt?: number;
}

// Проверка ролей
export const ROLE_LABELS: Record<Role, string> = {
  DEVELOPER: 'Разработчик',
  DIRECTOR: 'Директор',
  DEPUTY: 'Заместитель',
  ADMIN: 'Администратор',
  TEACHER: 'Учитель',
  ACCOUNTANT: 'Бухгалтер',
  ZAVHOZ: 'Завхоз',
};

export const hasFullAccess = (role: Role): boolean => {
  return ['DEVELOPER', 'DIRECTOR'].includes(role);
};

export const isAdmin = (role: Role): boolean => {
  return ['DEVELOPER', 'DIRECTOR', 'DEPUTY', 'ADMIN'].includes(role);
};

export const isTeacher = (role: Role): boolean => {
  return ['DEVELOPER', 'DIRECTOR', 'DEPUTY', 'ADMIN', 'TEACHER'].includes(role);
};
