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
    expect(screen.getByRole("link", { name: /Написать нам/i })).toHaveAttribute(
      "href",
      "mailto:info@mirai-edu.space"
    );
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
