// src/contexts/AuthContext.tsx
import { createContext, useCallback, useEffect, useState, useMemo, ReactNode } from "react";
import { api, ApiRequestError } from "../lib/api";
import type { User, Role, AuthContextValue } from "../types/auth";
import { FULL_ACCESS_ROLES, ADMIN_ROLES } from "../types/common";

const TOKEN_STORAGE_KEY = "auth_token";
const USER_STORAGE_KEY = "auth_user";
const SESSION_EXPIRY_KEY = "auth_expiry";

// Время жизни сессии (12 часов)
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

/**
 * Читает пользователя из localStorage
 */
const readStoredUser = (): User | null => {
  if (typeof window === "undefined") return null;
  
  // Проверяем истечение сессии
  const expiry = localStorage.getItem(SESSION_EXPIRY_KEY);
  if (expiry && Date.now() > parseInt(expiry, 10)) {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(SESSION_EXPIRY_KEY);
    return null;
  }
  
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  
  try {
    return JSON.parse(raw) as User;
  } catch (error) {
    console.warn("[Auth] Failed to parse stored user:", error);
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
};

/**
 * Контекст аутентификации с расширенным функционалом
 */
export const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: () => {},
  hasRole: () => false,
  hasPermission: () => false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => readStoredUser());
  const [token, setToken] = useState<string | null>(() =>
    typeof window === "undefined" ? null : localStorage.getItem(TOKEN_STORAGE_KEY)
  );
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Сохраняет сессию в state и localStorage
   */
  const persistSession = useCallback((nextToken: string | null, nextUser: User | null) => {
    setToken(nextToken);
    setUser(nextUser);

    if (typeof window !== "undefined") {
      if (nextToken) {
        localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
        localStorage.setItem(SESSION_EXPIRY_KEY, String(Date.now() + SESSION_DURATION_MS));
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(SESSION_EXPIRY_KEY);
      }

      if (nextUser) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
      } else {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    }

    api.setToken(nextToken);
  }, []);

  /**
   * Очищает сессию
   */
  const clearSession = useCallback(() => {
    persistSession(null, null);
  }, [persistSession]);

  /**
   * Инициализация сессии при загрузке
   */
  useEffect(() => {
    const initializeSession = async () => {
      // 1. Пробуем использовать HttpOnly cookie сессию
      try {
        const response = await api.get("/api/auth/me");
        const resolvedUser = response?.user ?? response ?? null;
        if (resolvedUser?.id) {
          persistSession(null, resolvedUser);
          return;
        }
      } catch (cookieError) {
        // Cookie сессия недоступна, пробуем токен
      }

      // 2. Пробуем токен из localStorage
      const storedToken = typeof window === "undefined" ? null : localStorage.getItem(TOKEN_STORAGE_KEY);
      const storedUser = readStoredUser();

      if (storedToken) {
        try {
          api.setToken(storedToken);
          const response = await api.get("/api/auth/me");
          const resolvedUser = response?.user ?? response ?? storedUser ?? null;
          if (resolvedUser?.id) {
            persistSession(storedToken, resolvedUser);
            return;
          }
        } catch (error) {
          // Проверяем тип ошибки
          if (error instanceof ApiRequestError && error.isUnauthorized()) {
            clearSession();
            return;
          }

          // При временной ошибке сети сохраняем оптимистичную сессию
          if (storedUser) {
            persistSession(storedToken, storedUser);
            return;
          }

          clearSession();
          return;
        }
      }

      // 3. Используем сохранённого пользователя (если есть)
      if (storedUser) {
        persistSession(null, storedUser);
        return;
      }

      clearSession();
    };

    initializeSession().finally(() => setIsLoading(false));
    
    // Устанавливаем обработчик для 401 ошибок
    api.setOnUnauthorized(() => {
      clearSession();
    });
  }, [persistSession, clearSession]);

  /**
   * Вход в систему
   */
  const login = useCallback(async (identifier: string, password: string) => {
    const res = await api.post("/api/auth/login", { login: identifier, password });
    const resolvedUser = res?.user ?? null;
    const resolvedToken = res?.token ?? null;

    if (!resolvedUser) {
      throw new Error("Не удалось получить данные пользователя");
    }

    persistSession(resolvedToken, resolvedUser);
  }, [persistSession]);

  /**
   * Выход из системы
   */
  const logout = useCallback(async () => {
    try {
      await api.post("/api/auth/logout");
    } catch (error) {
      console.warn("[Auth] Logout request failed:", error);
    } finally {
      clearSession();
    }
  }, [clearSession]);

  /**
   * Проверка роли пользователя
   */
  const hasRole = useCallback((roles: Role | Role[]): boolean => {
    if (!user) return false;
    
    const userRole = user.role as Role;
    
    // Полный доступ для DEVELOPER и DIRECTOR
    if (FULL_ACCESS_ROLES.includes(userRole)) return true;
    
    const roleList = Array.isArray(roles) ? roles : [roles];
    return roleList.includes(userRole);
  }, [user]);

  /**
   * Проверка разрешения на действие
   */
  const hasPermission = useCallback((module: string, action?: 'create' | 'edit' | 'delete' | 'export'): boolean => {
    if (!user) return false;
    
    const userRole = user.role as Role;
    
    // Полный доступ для DEVELOPER и DIRECTOR
    if (FULL_ACCESS_ROLES.includes(userRole)) return true;
    
    // Админы могут создавать и редактировать
    if (ADMIN_ROLES.includes(userRole)) {
      if (!action || action === 'create' || action === 'edit') return true;
      // Удаление только для ADMIN
      if (action === 'delete') return userRole === 'ADMIN';
    }
    
    // Экспорт для ACCOUNTANT
    if (action === 'export' && userRole === 'ACCOUNTANT') return true;
    
    return false;
  }, [user]);

  /**
   * Мемоизированное значение контекста
   */
  const contextValue = useMemo<AuthContextValue>(() => ({
    user,
    token,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    hasRole,
    hasPermission,
  }), [user, token, isLoading, login, logout, hasRole, hasPermission]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
