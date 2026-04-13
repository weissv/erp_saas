import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LandingPage from "./LandingPage";

describe("LandingPage", () => {
  it("renders the refactored marketing sections", () => {
    render(<LandingPage />);

    expect(
      screen.getByRole("heading", {
        name: /Управляйте школой как современной цифровой организацией/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /Закрываем ключевые контуры работы образовательного бизнеса/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Как проходит запуск Mirai Edu/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Log in/i })[0]).toHaveAttribute(
      "href",
      expect.stringMatching(/^http:\/\/test\..+\/auth\/login$/)
    );
    expect(screen.getByRole("button", { name: /Встать в очередь/i })).toBeInTheDocument();
    expect(screen.getByText(/Тестовая школа для входа: test/i)).toBeInTheDocument();
    expect(screen.getByText(/Логин: admin@test\.local/i)).toBeInTheDocument();
  });

  it("sets document metadata for the marketing page", () => {
    render(<LandingPage />);

    expect(document.title).toBe("Mirai Edu — цифровая платформа для управления школой");
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      "content",
      expect.stringContaining("Mirai Edu объединяет управление школой")
    );
  });
});
