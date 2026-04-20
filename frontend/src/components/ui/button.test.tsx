// src/components/ui/button.test.tsx
// Unit тесты для Button компонента

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

describe("Button", () => {
  describe("Рендеринг", () => {
    it("отображает текст кнопки", () => {
      render(<Button>Нажми меня</Button>);

      expect(screen.getByRole("button")).toHaveTextContent("Нажми меня");
    });

    it("применяет переданный className", () => {
      render(<Button className="custom-class">Тест</Button>);

      expect(screen.getByRole("button")).toHaveClass("custom-class");
    });

    it("передаёт дополнительные props", () => {
      render(
        <Button data-testid="test-button" type="submit">
          Отправить
        </Button>
      );

      expect(screen.getByTestId("test-button")).toHaveAttribute("type", "submit");
    });
  });

  describe("Варианты (variants)", () => {
    it("применяет default вариант по умолчанию", () => {
      render(<Button>Default</Button>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-primary");
      expect(button).toHaveClass("text-primary-foreground");
    });

    it("применяет outline вариант", () => {
      render(<Button variant="outline">Outline</Button>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("border");
      expect(button).toHaveClass("border-border");
      expect(button).toHaveClass("bg-card");
    });

    it("применяет ghost вариант", () => {
      render(<Button variant="ghost">Ghost</Button>);

      expect(screen.getByRole("button")).toHaveClass("text-primary");
    });

    it("применяет secondary вариант", () => {
      render(<Button variant="secondary">Secondary</Button>);

      expect(screen.getByRole("button")).toHaveClass("bg-secondary");
    });

    it("применяет destructive вариант", () => {
      render(<Button variant="destructive">Удалить</Button>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-destructive");
      expect(button).toHaveClass("text-destructive-foreground");
    });
  });

  describe("Размеры (sizes)", () => {
    it("применяет md размер по умолчанию", () => {
      render(<Button>Medium</Button>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("px-4");
      expect(button).toHaveClass("py-2.5");
      expect(button).toHaveClass("text-[13px]");
    });

    it("применяет sm размер", () => {
      render(<Button size="sm">Small</Button>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("px-3.5");
      expect(button).toHaveClass("py-2");
      expect(button).toHaveClass("text-[12px]");
    });

    it("применяет lg размер", () => {
      render(<Button size="lg">Large</Button>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("px-6");
      expect(button).toHaveClass("py-3");
      expect(button).toHaveClass("text-[14px]");
    });
  });

  describe("Состояние disabled", () => {
    it("применяет стили для disabled", () => {
      render(<Button disabled>Disabled</Button>);

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
      expect(button).toHaveClass("disabled:opacity-40");
      expect(button).toHaveClass("disabled:cursor-not-allowed");
    });

    it("не вызывает onClick когда disabled", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(
        <Button disabled onClick={onClick}>
          Disabled
        </Button>
      );

      await user.click(screen.getByRole("button"));

      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe("Взаимодействие", () => {
    it("вызывает onClick при клике", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<Button onClick={onClick}>Кликни</Button>);

      await user.click(screen.getByRole("button"));

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("поддерживает keyboard navigation", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<Button onClick={onClick}>Кнопка</Button>);

      const button = screen.getByRole("button");
      button.focus();
      await user.keyboard("{Enter}");

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("реагирует на пробел", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<Button onClick={onClick}>Кнопка</Button>);

      const button = screen.getByRole("button");
      button.focus();
      await user.keyboard(" ");

      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("Доступность (a11y)", () => {
    it('имеет role="button"', () => {
      render(<Button>Accessible</Button>);

      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("может принимать aria-label", () => {
      render(<Button aria-label="Close dialog">×</Button>);

      expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Close dialog");
    });

    it("поддерживает aria-disabled", () => {
      render(<Button aria-disabled="true">Aria Disabled</Button>);

      expect(screen.getByRole("button")).toHaveAttribute("aria-disabled", "true");
    });
  });

  describe("Базовые стили", () => {
    it("имеет rounded-full класс", () => {
      render(<Button>Round</Button>);

      expect(screen.getByRole("button")).toHaveClass("rounded-full");
    });

    it("имеет transition-all класс", () => {
      render(<Button>Transition</Button>);

      expect(screen.getByRole("button")).toHaveClass("transition-all");
    });

    it("имеет touch-manipulation класс", () => {
      render(<Button>Touch</Button>);

      expect(screen.getByRole("button")).toHaveClass("touch-manipulation");
    });
  });
});
