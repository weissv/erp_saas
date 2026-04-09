// src/test/utils/test-utils.tsx
// Утилиты для тестирования React-компонентов

import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { PermissionsContext } from '../../contexts/PermissionsContext';
import type { User, Role, AuthContextValue } from '../../types/auth';

// ============================================================================
// МОКИ ДАННЫХ
// ============================================================================

export const mockUser: User = {
  id: 1,
  login: 'testuser@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'director' as Role,
  telegramId: null,
  avatarUrl: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const mockAdminUser: User = {
  ...mockUser,
  id: 2,
  login: 'admin@example.com',
  firstName: 'Admin',
  role: 'admin' as Role,
};

export const mockTeacherUser: User = {
  ...mockUser,
  id: 3,
  login: 'teacher@example.com',
  firstName: 'Teacher',
  role: 'teacher' as Role,
};

export const mockToken = 'mock-jwt-token-12345';

// ============================================================================
// КОНТЕКСТ ПРОВАЙДЕРЫ
// ============================================================================

export interface MockAuthContextValue extends Partial<AuthContextValue> {
  user?: User | null;
  token?: string | null;
  isAuthenticated?: boolean;
  isLoading?: boolean;
}

export const createMockAuthContext = (overrides: MockAuthContextValue = {}): AuthContextValue => ({
  user: mockUser,
  token: mockToken,
  isLoading: false,
  isAuthenticated: true,
  login: vi.fn().mockResolvedValue(undefined),
  logout: vi.fn(),
  hasRole: vi.fn().mockReturnValue(true),
  hasPermission: vi.fn().mockReturnValue(true),
  ...overrides,
});

export interface MockPermissionsContextValue {
  permissions: string[];
  isLoading: boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}

export const createMockPermissionsContext = (
  permissions: string[] = ['read', 'write', 'delete', 'admin']
): MockPermissionsContextValue => ({
  permissions,
  isLoading: false,
  hasPermission: (permission: string) => permissions.includes(permission),
  hasAnyPermission: (perms: string[]) => perms.some((p) => permissions.includes(p)),
  hasAllPermissions: (perms: string[]) => perms.every((p) => permissions.includes(p)),
});

// ============================================================================
// WRAPPER КОМПОНЕНТ
// ============================================================================

interface AllProvidersProps {
  children: ReactNode;
  authContext?: MockAuthContextValue;
  permissionsContext?: MockPermissionsContextValue;
  initialEntries?: string[];
  routeConfig?: { path: string; element: ReactElement }[];
}

export const AllProviders: React.FC<AllProvidersProps> = ({
  children,
  authContext = {},
  permissionsContext,
  initialEntries = ['/'],
  routeConfig,
}) => {
  const authValue = createMockAuthContext(authContext);
  const permissionsValue = permissionsContext || createMockPermissionsContext();

  if (routeConfig) {
    return (
      <MemoryRouter initialEntries={initialEntries}>
        <AuthContext.Provider value={authValue}>
          <PermissionsContext.Provider value={permissionsValue as any}>
            <Routes>
              {routeConfig.map(({ path, element }) => (
                <Route key={path} path={path} element={element} />
              ))}
              <Route path="*" element={children} />
            </Routes>
          </PermissionsContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>
    );
  }

  return (
    <MemoryRouter initialEntries={initialEntries}>
      <AuthContext.Provider value={authValue}>
        <PermissionsContext.Provider value={permissionsValue as any}>
          {children}
        </PermissionsContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

// ============================================================================
// CUSTOM RENDER
// ============================================================================

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authContext?: MockAuthContextValue;
  permissionsContext?: MockPermissionsContextValue;
  initialEntries?: string[];
  routeConfig?: { path: string; element: ReactElement }[];
}

export function renderWithProviders(
  ui: ReactElement,
  {
    authContext,
    permissionsContext,
    initialEntries,
    routeConfig,
    ...renderOptions
  }: CustomRenderOptions = {}
): RenderResult {
  const Wrapper: React.FC<{ children: ReactNode }> = ({ children }) => (
    <AllProviders
      authContext={authContext}
      permissionsContext={permissionsContext}
      initialEntries={initialEntries}
      routeConfig={routeConfig}
    >
      {children}
    </AllProviders>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// ============================================================================
// УТИЛИТЫ
// ============================================================================

/**
 * Ожидает заданное количество миллисекунд
 */
export const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Ожидает следующего тика event loop
 */
export const nextTick = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Создаёт мок для fetch
 */
export const createFetchMock = (responses: Map<string, any>) => {
  return vi.fn().mockImplementation((url: string, options?: RequestInit) => {
    const response = responses.get(url);
    if (response) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(response),
        text: () => Promise.resolve(JSON.stringify(response)),
      });
    }
    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Not found' }),
    });
  });
};

/**
 * Мок для API ответа с пагинацией
 */
export const createPaginatedResponse = <T>(
  items: T[],
  page = 1,
  pageSize = 10
): { items: T[]; total: number; page: number; pageSize: number; totalPages: number } => ({
  items,
  total: items.length,
  page,
  pageSize,
  totalPages: Math.ceil(items.length / pageSize),
});

/**
 * Генерирует случайный ID
 */
export const randomId = (): number => Math.floor(Math.random() * 10000);

/**
 * Создаёт мок для react-router useNavigate
 */
export const createMockNavigate = () => vi.fn();

// Реэкспорт testing-library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
