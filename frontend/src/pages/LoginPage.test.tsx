// src/pages/LoginPage.test.tsx
// Unit тесты для страницы авторизации

import { describe, it, expect, vi, beforeEach} from 'vitest';
import { render, screen, fireEvent, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter} from 'react-router-dom';
import LoginPage from './LoginPage';

// Мок для useAuth
const mockLogin = vi.fn();
vi.mock('../hooks/useAuth', () => ({
 useAuth: () => ({
 login: mockLogin,
 user: null,
 isAuthenticated: false,
}),
}));

// Мок для useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
 const actual = await vi.importActual('react-router-dom');
 return {
 ...actual,
 useNavigate: () => mockNavigate,
};
});

// Мок для toast
vi.mock('sonner', () => ({
 toast: {
 success: vi.fn(),
 error: vi.fn(),
},
}));

const renderLoginPage = () => {
 return render(
 <BrowserRouter>
 <LoginPage />
 </BrowserRouter>
 );
};

describe('LoginPage', () => {
 beforeEach(() => {
 vi.clearAllMocks();
});

 describe('Рендеринг', () => {
 it('отображает форму логина', () => {
 renderLoginPage();

 expect(screen.getByLabelText(/логин/i)).toBeInTheDocument();
 expect(screen.getByLabelText(/пароль/i)).toBeInTheDocument();
 expect(screen.getByRole('button', { name: /войти/i})).toBeInTheDocument();
});

 it('отображает заголовок', () => {
 renderLoginPage();

 expect(screen.getByText(/управляйте школой/i)).toBeInTheDocument();
});

 it('отображает selling points', () => {
 renderLoginPage();

 expect(screen.getByText(/цифровые дашборды/i)).toBeInTheDocument();
 expect(screen.getByText(/контуры питания/i)).toBeInTheDocument();
 expect(screen.getByText(/документооборот/i)).toBeInTheDocument();
});

 it('отображает badge Mezon', () => {
 renderLoginPage();

 expect(screen.getByText(/mezon/i)).toBeInTheDocument();
});
});

 describe('Валидация формы', () => {
 it('показывает ошибку для пустого логина', async () => {
 renderLoginPage();

 const submitButton = screen.getByRole('button', { name: /войти/i});
 await userEvent.click(submitButton);

 await waitFor(() => {
 expect(screen.getByText(/логин обязателен/i)).toBeInTheDocument();
});
});

 it('показывает ошибку для пустого пароля', async () => {
 renderLoginPage();

 const loginInput = screen.getByLabelText(/логин/i);
 await userEvent.type(loginInput, 'testuser');

 const submitButton = screen.getByRole('button', { name: /войти/i});
 await userEvent.click(submitButton);

 await waitFor(() => {
 expect(screen.getByText(/пароль обязателен/i)).toBeInTheDocument();
});
});
});

 describe('Отправка формы', () => {
 it('вызывает login с правильными данными', async () => {
 mockLogin.mockResolvedValue({});
 renderLoginPage();

 const loginInput = screen.getByLabelText(/логин/i);
 const passwordInput = screen.getByLabelText(/пароль/i);

 await userEvent.type(loginInput, 'admin@test.com');
 await userEvent.type(passwordInput, 'password123');

 const submitButton = screen.getByRole('button', { name: /войти/i});
 await userEvent.click(submitButton);

 await waitFor(() => {
 expect(mockLogin).toHaveBeenCalledWith('admin@test.com', 'password123');
});
});

 it('показывает состояние загрузки', async () => {
 mockLogin.mockImplementation(() => new Promise(() => {})); // Never resolves
 renderLoginPage();

 const loginInput = screen.getByLabelText(/логин/i);
 const passwordInput = screen.getByLabelText(/пароль/i);

 await userEvent.type(loginInput, 'admin@test.com');
 await userEvent.type(passwordInput, 'password123');

 const submitButton = screen.getByRole('button', { name: /войти/i});
 await userEvent.click(submitButton);

 await waitFor(() => {
 expect(screen.getByText(/входим/i)).toBeInTheDocument();
});
});

 it('перенаправляет на главную после успешного входа', async () => {
 mockLogin.mockResolvedValue({});
 renderLoginPage();

 const loginInput = screen.getByLabelText(/логин/i);
 const passwordInput = screen.getByLabelText(/пароль/i);

 await userEvent.type(loginInput, 'admin@test.com');
 await userEvent.type(passwordInput, 'password123');

 const submitButton = screen.getByRole('button', { name: /войти/i});
 await userEvent.click(submitButton);

 await waitFor(() => {
 expect(mockNavigate).toHaveBeenCalledWith('/');
});
});
});

 describe('Обработка ошибок', () => {
 it('показывает toast при неверных учётных данных', async () => {
 const { toast} = await import('sonner');
 mockLogin.mockRejectedValue(new Error('Invalid credentials'));
 renderLoginPage();

 const loginInput = screen.getByLabelText(/логин/i);
 const passwordInput = screen.getByLabelText(/пароль/i);

 await userEvent.type(loginInput, 'wrong@test.com');
 await userEvent.type(passwordInput, 'wrongpassword');

 const submitButton = screen.getByRole('button', { name: /войти/i});
 await userEvent.click(submitButton);

 await waitFor(() => {
 expect(toast.error).toHaveBeenCalled();
});
});

 it('обрабатывает ошибку без сообщения', async () => {
 const { toast} = await import('sonner');
 mockLogin.mockRejectedValue({});
 renderLoginPage();

 const loginInput = screen.getByLabelText(/логин/i);
 const passwordInput = screen.getByLabelText(/пароль/i);

 await userEvent.type(loginInput, 'test@test.com');
 await userEvent.type(passwordInput, 'test');

 const submitButton = screen.getByRole('button', { name: /войти/i});
 await userEvent.click(submitButton);

 await waitFor(() => {
 expect(toast.error).toHaveBeenCalledWith(
 'Ошибка входа',
 expect.objectContaining({
 description: expect.any(String),
})
 );
});
});
});

 describe('Accessibility', () => {
 it('поля связаны с labels через htmlFor', () => {
 renderLoginPage();

 const loginLabel = screen.getByText('Логин');
 const loginInput = screen.getByLabelText(/логин/i);

 expect(loginLabel).toHaveAttribute('for', 'login');
 expect(loginInput).toHaveAttribute('id', 'login');
});

 it('форма имеет правильные autocomplete атрибуты', () => {
 renderLoginPage();

 const loginInput = screen.getByLabelText(/логин/i);
 const passwordInput = screen.getByLabelText(/пароль/i);

 expect(loginInput).toHaveAttribute('autocomplete', 'off');
 expect(passwordInput).toHaveAttribute('autocomplete', 'new-password');
});

 it('кнопка disabled во время отправки', async () => {
 mockLogin.mockImplementation(() => new Promise(() => {}));
 renderLoginPage();

 const loginInput = screen.getByLabelText(/логин/i);
 const passwordInput = screen.getByLabelText(/пароль/i);

 await userEvent.type(loginInput, 'test@test.com');
 await userEvent.type(passwordInput, 'test');

 const submitButton = screen.getByRole('button', { name: /войти/i});
 await userEvent.click(submitButton);

 await waitFor(() => {
 expect(screen.getByRole('button')).toBeDisabled();
});
});
});
});
