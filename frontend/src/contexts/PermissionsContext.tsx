// src/contexts/PermissionsContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import type { UserRole } from "../types/auth";
import { FULL_ACCESS_ROLES } from "../types/common";

interface RolePermissions {
  role: UserRole;
  isFullAccess: boolean;
  modules: string[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
}

interface PermissionsContextValue {
  permissions: RolePermissions | null;
  isLoading: boolean;
  hasModuleAccess: (modulePath: string) => boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  refetch: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextValue>({
  permissions: null,
  isLoading: true,
  hasModuleAccess: () => false,
  canCreate: false,
  canEdit: false,
  canDelete: false,
  canExport: false,
  refetch: async () => {},
});

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPermissions = async () => {
    if (!user) {
      setPermissions(null);
      setIsLoading(false);
      return;
    }

    // Если у пользователя полный доступ, не нужно загружать права из БД
    if (FULL_ACCESS_ROLES.includes(user.role as UserRole)) {
      setPermissions({
        role: user.role as UserRole,
        isFullAccess: true,
        modules: [], // Не используется для полного доступа
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canExport: true,
      });
      setIsLoading(false);
      return;
    }

    try {
      const data = await api.get(`/api/permissions/${user.role}`);
      setPermissions(data);
    } catch (error) {
      console.error("Failed to fetch permissions:", error);
      // Устанавливаем дефолтные права для роли
      setPermissions({
        role: user.role as UserRole,
        isFullAccess: false,
        modules: [],
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canExport: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchPermissions();
    }
  }, [user, authLoading]);

  const hasModuleAccess = (modulePath: string): boolean => {
    if (!permissions) return false;
    if (permissions.isFullAccess) return true;
    
    // Убираем начальный слэш для сравнения
    const moduleId = modulePath.startsWith("/") ? modulePath.slice(1) : modulePath;
    return permissions.modules.includes(moduleId);
  };

  const value: PermissionsContextValue = {
    permissions,
    isLoading: isLoading || authLoading,
    hasModuleAccess,
    canCreate: permissions?.canCreate ?? false,
    canEdit: permissions?.canEdit ?? false,
    canDelete: permissions?.canDelete ?? false,
    canExport: permissions?.canExport ?? false,
    refetch: fetchPermissions,
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}
