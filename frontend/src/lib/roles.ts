import type { Role } from '../types/common';
import { ROLE_LABELS } from './constants';
import { MODULE_LINKS } from './modules';

export const ROLE_COLORS: Record<Role, string> = {
  DEVELOPER: 'bg-red-100 text-red-800',
  DIRECTOR: 'bg-purple-100 text-purple-800',
  DEPUTY: 'bg-blue-100 text-blue-800',
  ADMIN: 'bg-green-100 text-green-800',
  TEACHER: 'bg-yellow-100 text-yellow-800',
  ACCOUNTANT: 'bg-gray-100 text-gray-800',
  ZAVHOZ: 'bg-orange-100 text-orange-800',
};

export const PERMISSION_MODULES = MODULE_LINKS.map(({ path, label }) => ({
  id: path.replace(/^\//, ''),
  label,
}));

export { ROLE_LABELS };export const ROLES = {
  DIRECTOR: "DIRECTOR",
  DEPUTY: "DEPUTY",
  ADMIN: "ADMIN",
  TEACHER: "TEACHER",
  ACCOUNTANT: "ACCOUNTANT",
};