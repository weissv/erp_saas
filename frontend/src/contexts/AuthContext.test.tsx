// src/contexts/AuthContext.test.tsx
// Unit тесты для AuthContext

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, AuthContext } from './AuthContext';
import { useContext } from 'react';

// Мок для api модуля
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockSetToken = vi.fn();
const mockSetOnUnauthorized = vi.fn();

vi.mock('../lib/api', () => ({
  api: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
    setToken: (...args: any[]) => mockSetToken(...args),
    setOnUnauthorized: (...args: any[]) => mockSetOnUnauthorized(...args),
  },
  ApiRequestError: class extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;
    }
    isUnauthorized() {
      return this.statusCode === 401;
    }
  },
}));

// Компонент для тестирования контекста
const TestConsumer = () => {
  const auth = useContext(AuthContext);
  
  return (
    <div>
      <div data-testid="loading">{String(auth.isLoading)}</div>
      <div data-testid="authenticated">{String(auth.isAuthenticated)}</div>
      <div data-testid="user">{auth.user ? JSON.stringify(auth.user) : 'null'}</div>
      <div data-testid="token">{auth.token || 'null'}</div>
      <button onClick={() => auth.login('test@example.com', 'password')}>Login</button>
      <button onClick={() => auth.logout()}>Logout</button>
      <div data-testid="hasRole-director">{String(auth.hasRole('director'))}</div>
      <div data-testid="hasPermission-create">{String(auth.hasPermission('users', 'create'))}</div>
    </div>
  );
};

describe('AuthContext', () => {
  const mockUser = {
    id: 1,
    login: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'director',
  };

  const mockToken = 'mock-jwt-token';

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    
    // По умолчанию - неаутентифицированный пользователь
    mockGet.mockRejectedValue(new Error('Not authenticated'));
    mockPost.mockResolvedValue({ user: mockUser, token: mockToken });
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Инициализация', () => {
    it('начинает с isLoading = true', async () => {
      mockGet.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      expect(screen.getByTestId('loading')).toHaveTextContent('true');
    });

    it('устанавливает isLoading = false после инициализации', async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });
    });

    it('восстанавливает сессию из localStorage', async () => {
      localStorage.setItem('auth_token', mockToken);
      localStorage.setItem('auth_user', JSON.stringify(mockUser));
      localStorage.setItem('auth_expiry', String(Date.now() + 1000 * 60 * 60));
      
      mockGet.mockResolvedValue({ user: mockUser });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      });
    });

    it('очищает просроченную сессию', async () => {
      localStorage.setItem('auth_token', mockToken);
      localStorage.setItem('auth_user', JSON.stringify(mockUser));
      localStorage.setItem('auth_expiry', String(Date.now() - 1000)); // Expired
      
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
      });
    });
  });

  describe('Login', () => {
    it('выполняет вход и сохраняет сессию', async () => {
      const user = userEvent.setup();
      
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      });

      expect(mockPost).toHaveBeenCalledWith('/api/auth/login', {
        login: 'test@example.com',
        password: 'password',
      });
    });

    it('сохраняет токен в localStorage', async () => {
      const user = userEvent.setup();
      
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(localStorage.getItem('auth_token')).toBe(mockToken);
      });
    });

    it('устанавливает токен в API клиенте', async () => {
      const user = userEvent.setup();
      
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(mockSetToken).toHaveBeenCalledWith(mockToken);
      });
    });
  });

  describe('Logout', () => {
    it('выполняет выход и очищает сессию', async () => {
      localStorage.setItem('auth_token', mockToken);
      localStorage.setItem('auth_user', JSON.stringify(mockUser));
      localStorage.setItem('auth_expiry', String(Date.now() + 1000 * 60 * 60));
      
      mockGet.mockResolvedValue({ user: mockUser });
      mockPost.mockResolvedValue({});

      const user = userEvent.setup();
      
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      });

      await user.click(screen.getByRole('button', { name: /logout/i }));

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
      });

      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('auth_user')).toBeNull();
    });

    it('отправляет запрос на выход', async () => {
      localStorage.setItem('auth_token', mockToken);
      localStorage.setItem('auth_user', JSON.stringify(mockUser));
      localStorage.setItem('auth_expiry', String(Date.now() + 1000 * 60 * 60));
      
      mockGet.mockResolvedValue({ user: mockUser });
      mockPost.mockResolvedValue({});

      const user = userEvent.setup();
      
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      });

      await user.click(screen.getByRole('button', { name: /logout/i }));

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith('/api/auth/logout');
      });
    });

    it('очищает сессию даже при ошибке запроса', async () => {
      localStorage.setItem('auth_token', mockToken);
      localStorage.setItem('auth_user', JSON.stringify(mockUser));
      localStorage.setItem('auth_expiry', String(Date.now() + 1000 * 60 * 60));
      
      mockGet.mockResolvedValue({ user: mockUser });
      mockPost.mockRejectedValue(new Error('Network error'));

      const user = userEvent.setup();
      
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      });

      await user.click(screen.getByRole('button', { name: /logout/i }));

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
      });
    });
  });

  describe('hasRole', () => {
    it('возвращает true для роли пользователя', async () => {
      localStorage.setItem('auth_token', mockToken);
      localStorage.setItem('auth_user', JSON.stringify(mockUser));
      localStorage.setItem('auth_expiry', String(Date.now() + 1000 * 60 * 60));
      
      mockGet.mockResolvedValue({ user: mockUser });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('hasRole-director')).toHaveTextContent('true');
      });
    });

    it('возвращает false для неаутентифицированного пользователя', async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('hasRole-director')).toHaveTextContent('false');
    });
  });

  describe('hasPermission', () => {
    it('возвращает true для директора', async () => {
      localStorage.setItem('auth_token', mockToken);
      localStorage.setItem('auth_user', JSON.stringify(mockUser));
      localStorage.setItem('auth_expiry', String(Date.now() + 1000 * 60 * 60));
      
      mockGet.mockResolvedValue({ user: mockUser });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('hasPermission-create')).toHaveTextContent('true');
      });
    });

    it('возвращает false для неаутентифицированного пользователя', async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('hasPermission-create')).toHaveTextContent('false');
    });
  });

  describe('Обработка 401 ошибок', () => {
    it('регистрирует callback для 401 ошибок', async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockSetOnUnauthorized).toHaveBeenCalled();
      });
    });
  });
});
