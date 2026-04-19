// src/pages/DashboardPage.test.tsx
// Unit тесты для страницы Dashboard

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import DashboardPage from "./DashboardPage";

const mockRefetch = vi.fn();
const mockSavePreferences = vi.fn();
const mockSaveLayout = vi.fn();
const mockResetPreferences = vi.fn();
const mockUseDashboardPreferences = vi.fn();

const mockBootstrap = {
  preferences: {
    layout: [
      { widgetId: "kpi-overview", x: 0, y: 0, w: 12, h: 2 },
      { widgetId: "quick-actions", x: 0, y: 2, w: 12, h: 2 },
    ],
    enabledWidgets: ["kpi-overview", "quick-actions"],
    collapsedSections: [],
    pinnedActions: [],
    widgetFilters: {},
    savedViews: [],
    activeView: null,
  },
  availableWidgets: [
    {
      id: "kpi-overview",
      title: "Ключевые показатели",
      category: "kpi",
      description: "",
      defaultSize: { w: 12, h: 2 },
      minSize: { w: 6, h: 2 },
      maxSize: { w: 12, h: 4 },
      canHide: false,
      canResize: true,
      refreshInterval: 300000,
    },
    {
      id: "quick-actions",
      title: "Быстрые действия",
      category: "actions",
      description: "",
      defaultSize: { w: 12, h: 2 },
      minSize: { w: 6, h: 2 },
      maxSize: { w: 12, h: 4 },
      canHide: false,
      canResize: false,
      refreshInterval: 0,
    },
  ],
  quickActions: [
    { id: "add-child", label: "Добавить ребёнка", icon: "UserPlus", path: "/children" },
    { id: "mark-attendance", label: "Отметить посещаемость", icon: "CheckSquare", path: "/attendance" },
  ],
  overview: {
    generatedAt: new Date().toISOString(),
    metrics: [
      { id: "children", label: "Дети на учёте", value: 150, hint: "145 присутствуют сегодня", tone: "primary" },
      { id: "employees", label: "Активные сотрудники", value: 35, hint: "30 отметок за день", tone: "success" },
    ],
    alerts: [{ id: "maintenance", label: "Активные заявки", value: 3, tone: "warning", path: "/maintenance" }],
    visibleWidgetCount: 2,
    quickActionCount: 2,
  },
};

vi.mock("../hooks/useDashboardPreferences", () => ({
  useDashboardPreferences: () => mockUseDashboardPreferences(),
}));

vi.mock("../components/dashboard/DashboardLayout", () => ({
  default: ({ availableWidgets }: { availableWidgets: Array<{ id: string; title: string }> }) => (
    <div data-testid="dashboard-layout">
      {availableWidgets.map((widget) => (
        <span key={widget.id}>{widget.title}</span>
      ))}
    </div>
  ),
}));

vi.mock("../components/dashboard/PersonalizationPanel", () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="personalization-panel">
        <button type="button" onClick={onClose}>
          Закрыть панель
        </button>
      </div>
    ) : null,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const renderDashboard = () =>
  render(
    <BrowserRouter>
      <DashboardPage />
    </BrowserRouter>
  );

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDashboardPreferences.mockReturnValue({
      bootstrap: mockBootstrap,
      preferences: mockBootstrap.preferences,
      isLoading: false,
      error: null,
      savePreferences: mockSavePreferences,
      saveLayout: mockSaveLayout,
      resetPreferences: mockResetPreferences,
      refetch: mockRefetch,
    });
  });

  it("показывает заголовок и overview-данные", () => {
    renderDashboard();

    expect(screen.getByRole("heading", { name: "Дашборд" })).toBeInTheDocument();
    expect(screen.getByText("Дети на учёте")).toBeInTheDocument();
    expect(screen.getByText("Активные заявки")).toBeInTheDocument();
    expect(screen.getByText("Ключевые показатели")).toBeInTheDocument();
  });

  it("показывает кнопки управления", () => {
    renderDashboard();

    expect(screen.getByRole("button", { name: /Редактировать/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Настроить/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Обновить/i })).toBeInTheDocument();
  });

  it("переключает режим редактирования", async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole("button", { name: /Редактировать/i }));

    expect(screen.getByRole("button", { name: /Готово/i })).toBeInTheDocument();
  });

  it("открывает панель настроек", async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole("button", { name: /Настроить/i }));

    expect(screen.getByTestId("personalization-panel")).toBeInTheDocument();
  });

  it("вызывает refetch при обновлении", async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole("button", { name: /Обновить/i }));

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it("показывает состояние ошибки", () => {
    mockUseDashboardPreferences.mockReturnValue({
      bootstrap: null,
      preferences: null,
      isLoading: false,
      error: "API Error",
      savePreferences: mockSavePreferences,
      saveLayout: mockSaveLayout,
      resetPreferences: mockResetPreferences,
      refetch: mockRefetch,
    });

    renderDashboard();

    expect(screen.getByText("API Error")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Повторить/i })).toBeInTheDocument();
  });
});
