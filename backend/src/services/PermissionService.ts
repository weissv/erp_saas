import { Prisma, Role } from '@prisma/client';
import { prisma } from '../prisma';
import { AuthorizationError, ValidationError } from '../utils/errors';

const FULL_ACCESS_ROLES: Role[] = ['DEVELOPER', 'DIRECTOR'];
const ALL_ROLES: Role[] = ['DEVELOPER', 'DIRECTOR', 'DEPUTY', 'ADMIN', 'TEACHER', 'ACCOUNTANT', 'ZAVHOZ'];
const ALL_MODULES = [
  'dashboard',
  'children',
  'employees',
  'schedule',
  'staffing',
  'users',
  'groups',
  'clubs',
  'attendance',
  'finance',
  'inventory',
  'menu',
  'recipes',
  'procurement',
  'maintenance',
  'security',
  'documents',
  'calendar',
  'feedback',
  'integration',
  'action-log',
  'notifications',
  'ai-assistant',
  'knowledge-base',
  'exams',
];

export interface PermissionUpdateInput {
  modules?: string[];
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canExport?: boolean;
  customPermissions?: Record<string, boolean>;
}

class PermissionServiceClass {
  private prisma = prisma;

  async list(currentUserRole: string) {
    const permissions = await this.prisma.rolePermission.findMany({ orderBy: { role: 'asc' } });

    return ALL_ROLES.map((role) => this.serializePermission(role, currentUserRole, permissions.find((item) => item.role === role)));
  }

  async get(role: Role, currentUserRole?: string) {
    this.assertKnownRole(role);

    const adminRoles: Role[] = ['DEVELOPER', 'DIRECTOR', 'DEPUTY', 'ADMIN'];
    const canView = currentUserRole === role || (currentUserRole ? adminRoles.includes(currentUserRole as Role) : false);
    if (!canView) {
      throw new AuthorizationError();
    }

    const permission = await this.prisma.rolePermission.findUnique({ where: { role } });
    return this.serializePermission(role, currentUserRole || '', permission || undefined);
  }

  async update(role: Role, currentUser: { id: number; role: string }, data: PermissionUpdateInput) {
    this.assertKnownRole(role);
    this.assertCanEditRole(role, currentUser.role);

    const normalizedModules = Array.from(new Set((data.modules || []).filter((moduleId) => ALL_MODULES.includes(moduleId))));

    const permission = await this.prisma.rolePermission.upsert({
      where: { role },
      update: {
        modules: normalizedModules,
        canCreate: data.canCreate ?? true,
        canEdit: data.canEdit ?? true,
        canDelete: data.canDelete ?? true,
        canExport: data.canExport ?? false,
        customPermissions: data.customPermissions || {},
      },
      create: {
        role,
        modules: normalizedModules,
        canCreate: data.canCreate ?? true,
        canEdit: data.canEdit ?? true,
        canDelete: data.canDelete ?? true,
        canExport: data.canExport ?? false,
        customPermissions: data.customPermissions || {},
      },
    });

    await this.prisma.actionLog.create({
      data: {
        userId: currentUser.id,
        action: 'ROLE_PERMISSION_UPDATED',
        details: {
          role,
          modules: normalizedModules,
          canCreate: permission.canCreate,
          canEdit: permission.canEdit,
          canDelete: permission.canDelete,
          canExport: permission.canExport,
        },
      },
    });

    return this.serializePermission(role, currentUser.role, permission);
  }

  getModules() {
    return ALL_MODULES;
  }

  private serializePermission(role: Role, currentUserRole: string, permission?: {
    role: Role;
    modules: string[];
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canExport: boolean;
    customPermissions: Prisma.JsonValue | null;
  }) {
    const isFullAccess = FULL_ACCESS_ROLES.includes(role);

    return {
      role,
      isFullAccess,
      canBeEdited: currentUserRole === 'DEVELOPER' ? true : !FULL_ACCESS_ROLES.includes(role),
      modules: isFullAccess ? ALL_MODULES : permission?.modules || [],
      canCreate: isFullAccess ? true : (permission?.canCreate ?? true),
      canEdit: isFullAccess ? true : (permission?.canEdit ?? true),
      canDelete: isFullAccess ? true : (permission?.canDelete ?? true),
      canExport: isFullAccess ? true : (permission?.canExport ?? false),
      customPermissions: isFullAccess ? {} : (permission?.customPermissions || {}),
    };
  }

  private assertCanEditRole(targetRole: Role, currentUserRole: string) {
    if (currentUserRole === 'DEVELOPER') {
      return;
    }

    if (targetRole === 'DEVELOPER' || targetRole === 'DIRECTOR') {
      throw new AuthorizationError('Нельзя изменять права этой роли');
    }
  }

  private assertKnownRole(role: Role) {
    if (!ALL_ROLES.includes(role)) {
      throw new ValidationError('Invalid role');
    }
  }
}

export const permissionService = new PermissionServiceClass();