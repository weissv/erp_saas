// src/pages/LoginPage.test.tsx
// Unit тесты для страницы авторизации

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import LoginPage from "./LoginPage";

const mockLogin = vi.fn();
const mockNavigate = vi.fn();

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    login: mockLogin,
    user: null,
    isAuthenticated: false,
  }),
}));

vi.mock("../contexts/TenantContext", () => ({
  useTenant: () => ({
    tenant: {
      name: "Test ERP",
      logoUrl: "/logo.png",
      faviconUrl: "/favicon.ico",
      primaryColor: "#007AFF",
      supportEmail: "",
      supportPhone: "",
    },
    isLoading: false,
  }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const renderLoginPage = () =>
  render(
    <BrowserRouter>
      <LoginPage />
    </BrowserRouter>
  );

const getPasswordInput = () => screen.getByLabelText(/^пароль$/i, { selector: "input" });

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Рендеринг", () => {
    it("отображает форму логина", () => {
      renderLoginPage();

      expect(screen.getByLabelText(/логин/i)).toBeInTheDocument();
      expect(getPasswordInput()).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /войти/i })).toBeInTheDocument();
    });

    it("отображает заголовок", () => {
      renderLoginPage();

      expect(screen.getByText(/управляйте школой/i)).toBeInTheDocument();
    });

    it("отображает selling points", () => {
      renderLoginPage();

      expect(screen.getByText(/цифровые дашборды/i)).toBeInTheDocument();
      expect(screen.getByText(/контуры питания/i)).toBeInTheDocument();
      expect(screen.getByText(/документооборот/i)).toBeInTheDocument();
    });

    it("отображает tenant badge", () => {
      renderLoginPage();

      expect(screen.getByText(/Test ERP/i)).toBeInTheDocument();
    });
  });

  describe("Валидация формы", () => {
    it("показывает ошибку для пустого логина", async () => {
      renderLoginPage();

      await userEvent.click(screen.getByRole("button", { name: /войти/i }));

      await waitFor(() => {
        expect(screen.getByText(/логин обязателен/i)).toBeInTheDocument();
      });
    });

    it("показывает ошибку для пустого пароля", async () => {
      renderLoginPage();

      await userEvent.type(screen.getByLabelText(/логин/i), "testuser");
      await userEvent.click(screen.getByRole("button", { name: /войти/i }));

      await waitFor(() => {
        expect(screen.getByText(/пароль обязателен/i)).toBeInTheDocument();
      });
    });
  });

  describe("Отправка формы", () => {
    it("вызывает login с правильными данными", async () => {
      mockLogin.mockResolvedValue({});
      renderLoginPage();

      await userEvent.type(screen.getByLabelText(/логин/i), "admin@test.com");
      await userEvent.type(getPasswordInput(), "password123");
      await userEvent.click(screen.getByRole("button", { name: /войти/i }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith("admin@test.com", "password123");
      });
    });

    it("показывает состояние загрузки", async () => {
      mockLogin.mockImplementation(() => new Promise(() => {}));
      renderLoginPage();

      await userEvent.type(screen.getByLabelText(/логин/i), "admin@test.com");
      await userEvent.type(getPasswordInput(), "password123");
      await userEvent.click(screen.getByRole("button", { name: /войти/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /входим/i })).toBeInTheDocument();
      });
    });

    it("перенаправляет на главную после успешного входа", async () => {
      mockLogin.mockResolvedValue({});
      renderLoginPage();

      await userEvent.type(screen.getByLabelText(/логин/i), "admin@test.com");
      await userEvent.type(getPasswordInput(), "password123");
      await userEvent.click(screen.getByRole("button", { name: /войти/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/");
      });
    });
  });

  describe("Обработка ошибок", () => {
    it("показывает toast при неверных учётных данных", async () => {
      const { toast } = await import("sonner");
      mockLogin.mockRejectedValue(new Error("Invalid credentials"));
      renderLoginPage();

      await userEvent.type(screen.getByLabelText(/логин/i), "wrong@test.com");
      await userEvent.type(getPasswordInput(), "wrongpassword");
      await userEvent.click(screen.getByRole("button", { name: /войти/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });

    it("обрабатывает ошибку без сообщения", async () => {
      const { toast } = await import("sonner");
      mockLogin.mockRejectedValue({});
      renderLoginPage();

      await userEvent.type(screen.getByLabelText(/логин/i), "test@test.com");
      await userEvent.type(getPasswordInput(), "test");
      await userEvent.click(screen.getByRole("button", { name: /войти/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Ошибка входа",
          expect.objectContaining({
            description: expect.any(String),
          })
        );
      });
    });
  });

  describe("Accessibility", () => {
    it("поля связаны с labels через htmlFor", () => {
      renderLoginPage();

      const loginLabel = screen.getByText("Логин");
      const loginInput = screen.getByLabelText(/логин/i);

      expect(loginLabel).toHaveAttribute("for", "login");
      expect(loginInput).toHaveAttribute("id", "login");
    });

    it("форма имеет правильные autocomplete атрибуты", () => {
      renderLoginPage();

      expect(screen.getByLabelText(/логин/i)).toHaveAttribute("autocomplete", "off");
      expect(getPasswordInput()).toHaveAttribute("autocomplete", "new-password");
    });

    it("кнопка disabled во время отправки", async () => {
      mockLogin.mockImplementation(() => new Promise(() => {}));
      renderLoginPage();

      await userEvent.type(screen.getByLabelText(/логин/i), "test@test.com");
      await userEvent.type(getPasswordInput(), "test");
      await userEvent.click(screen.getByRole("button", { name: /войти/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /входим/i })).toBeDisabled();
      });
    });
  });
});
