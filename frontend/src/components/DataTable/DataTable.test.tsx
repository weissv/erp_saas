// src/components/DataTable/DataTable.test.tsx
// Unit тесты для DataTable компонента

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataTable, Column } from "./DataTable";

const mockCreateObjectURL = vi.fn(() => "blob:test-url");
const mockRevokeObjectURL = vi.fn();
URL.createObjectURL = mockCreateObjectURL;
URL.revokeObjectURL = mockRevokeObjectURL;

const mockClick = vi.fn();
const originalCreateElement = document.createElement.bind(document);
vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
  const element = originalCreateElement(tagName);
  if (tagName === "a") {
    element.click = mockClick;
  }
  return element;
});

interface TestData {
  id: number;
  name: string;
  email: string;
  status: string;
  amount: number;
}

const testData: TestData[] = [
  { id: 1, name: "Иван Иванов", email: "ivan@test.com", status: "active", amount: 1000 },
  { id: 2, name: "Анна Петрова", email: "anna@test.com", status: "inactive", amount: 2000 },
  { id: 3, name: "Пётр Сидоров", email: "petr@test.com", status: "active", amount: 3000 },
];

const testColumns: Column<TestData>[] = [
  { key: "id", header: "ID" },
  { key: "name", header: "Имя" },
  { key: "email", header: "Email" },
  { key: "status", header: "Статус" },
  { key: "amount", header: "Сумма" },
];

describe("DataTable", () => {
  const defaultProps = {
    data: testData,
    columns: testColumns,
    page: 1,
    pageSize: 10,
    total: 3,
    onPageChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Рендеринг", () => {
    it("отображает заголовки колонок", () => {
      render(<DataTable {...defaultProps} />);

      expect(screen.getByText("ID")).toBeInTheDocument();
      expect(screen.getByText("Имя")).toBeInTheDocument();
      expect(screen.getByText("Email")).toBeInTheDocument();
      expect(screen.getByText("Статус")).toBeInTheDocument();
      expect(screen.getByText("Сумма")).toBeInTheDocument();
    });

    it("отображает данные в ячейках", () => {
      render(<DataTable {...defaultProps} />);

      expect(screen.getByText("Иван Иванов")).toBeInTheDocument();
      expect(screen.getByText("ivan@test.com")).toBeInTheDocument();
      expect(screen.getAllByText("active")).toHaveLength(2);
    });

    it("отображает общее количество записей", () => {
      render(<DataTable {...defaultProps} />);

      expect(screen.getByText(/Всего:/i).parentElement).toHaveTextContent("Всего: 3");
    });

    it("отображает текущую страницу и общее количество страниц", () => {
      render(<DataTable {...defaultProps} />);

      expect(screen.getByText(/1\s*\/\s*1/i)).toBeInTheDocument();
    });

    it("отображает сообщение при пустых данных", () => {
      render(<DataTable {...defaultProps} data={[]} total={0} />);

      expect(screen.getByText("Нет данных")).toBeInTheDocument();
    });
  });

  describe("Пагинация", () => {
    it('вызывает onPageChange при клике на "Следующая страница"', async () => {
      const onPageChange = vi.fn();
      render(<DataTable {...defaultProps} total={30} pageSize={10} onPageChange={onPageChange} />);

      await userEvent.click(screen.getByRole("button", { name: /Следующая страница/i }));

      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it('вызывает onPageChange при клике на "Предыдущая страница"', async () => {
      const onPageChange = vi.fn();
      render(<DataTable {...defaultProps} page={2} total={30} pageSize={10} onPageChange={onPageChange} />);

      await userEvent.click(screen.getByRole("button", { name: /Предыдущая страница/i }));

      expect(onPageChange).toHaveBeenCalledWith(1);
    });

    it('отключает кнопку "Предыдущая страница" на первой странице', () => {
      render(<DataTable {...defaultProps} page={1} />);

      expect(screen.getByRole("button", { name: /Предыдущая страница/i })).toBeDisabled();
    });

    it('отключает кнопку "Следующая страница" на последней странице', () => {
      render(<DataTable {...defaultProps} page={3} total={30} pageSize={10} />);

      expect(screen.getByRole("button", { name: /Следующая страница/i })).toBeDisabled();
    });

    it("корректно рассчитывает количество страниц", () => {
      render(<DataTable {...defaultProps} total={25} pageSize={10} />);

      expect(screen.getByText(/1\s*\/\s*3/i)).toBeInTheDocument();
    });
  });

  describe("Кастомный рендеринг ячеек", () => {
    it("использует кастомный render для колонки", () => {
      const customColumns: Column<TestData>[] = [
        ...testColumns.slice(0, 3),
        {
          key: "status",
          header: "Статус",
          render: (row) => (
            <span data-testid="custom-status" className={row.status === "active" ? "green" : "red"}>
              {row.status === "active" ? "Активен" : "Неактивен"}
            </span>
          ),
        },
        testColumns[4],
      ];

      render(<DataTable {...defaultProps} columns={customColumns} />);

      const customStatuses = screen.getAllByTestId("custom-status");
      expect(customStatuses).toHaveLength(3);
      expect(customStatuses[0]).toHaveTextContent("Активен");
      expect(customStatuses[1]).toHaveTextContent("Неактивен");
    });
  });

  describe("Экспорт CSV", () => {
    it("экспортирует данные в CSV при клике на кнопку", async () => {
      render(<DataTable {...defaultProps} />);

      await userEvent.click(screen.getByRole("button", { name: /Экспорт данных в CSV/i }));

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });
  });

  describe("Опция wrapCells", () => {
    it("применяет классы для переноса текста когда wrapCells=true", () => {
      const { container } = render(<DataTable {...defaultProps} wrapCells />);

      expect(container.querySelector("table")).toHaveClass("table-fixed");
      container.querySelectorAll("th").forEach((cell) => {
        expect(cell).toHaveClass("whitespace-normal");
        expect(cell).toHaveClass("break-words");
      });
    });

    it("применяет классы без переноса когда wrapCells=false", () => {
      const { container } = render(<DataTable {...defaultProps} wrapCells={false} />);

      expect(container.querySelector("table")).not.toHaveClass("table-fixed");
      container.querySelectorAll("th").forEach((cell) => {
        expect(cell).toHaveClass("whitespace-nowrap");
      });
    });
  });

  describe("Обработка null/undefined значений", () => {
    it("отображает пустую строку для null значений", () => {
      const dataWithNull: TestData[] = [{ id: 1, name: "Тест", email: null as any, status: "active", amount: 1000 }];

      render(<DataTable {...defaultProps} data={dataWithNull} total={1} />);

      expect(screen.getAllByRole("row")).toHaveLength(2);
    });

    it("отображает пустую строку для undefined значений", () => {
      const dataWithUndefined: Partial<TestData>[] = [{ id: 1, name: "Тест", status: "active" }];

      render(<DataTable {...defaultProps} data={dataWithUndefined as TestData[]} total={1} />);

      expect(screen.getAllByRole("row")).toHaveLength(2);
    });
  });

  describe("Доступность (a11y)", () => {
    it("таблица имеет корректную структуру", () => {
      const { container } = render(<DataTable {...defaultProps} />);

      expect(container.querySelector("table")).toBeInTheDocument();
      expect(container.querySelector("thead")).toBeInTheDocument();
      expect(container.querySelector("tbody")).toBeInTheDocument();
    });

    it("кнопки пагинации доступны для keyboard navigation", () => {
      render(<DataTable {...defaultProps} total={30} pageSize={10} />);

      screen.getAllByRole("button").forEach((button) => {
        expect(button).not.toHaveAttribute("tabindex", "-1");
      });
    });
  });
});
