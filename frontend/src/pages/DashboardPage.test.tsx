// src/pages/DashboardPage.test.tsx
// Unit тесты для страницы Dashboard (модульный дашборд)

import { describe, it, expect, vi, beforeEach} from 'vitest';
import { render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter} from 'react-router-dom';
import DashboardPage from './DashboardPage';

// Мок bootstrap-ответа
const mockBootstrap = {
 preferences: {
 layout: [
 { widgetId: 'kpi-overview', x: 0, y: 0, w: 12, h: 2},
 { widgetId: 'attendance-today', x: 0, y: 2, w: 4, h: 2},
 { widgetId: 'finance-overview', x: 4, y: 2, w: 4, h: 3},
 ],
 enabledWidgets: ['kpi-overview', 'attendance-today', 'finance-overview', 'quick-actions'],
 collapsedSections: [],
 pinnedActions: [],
 widgetFilters: {},
 savedViews: [],
 activeView: null,
},
 availableWidgets: [
 { id: 'kpi-overview', title: 'Ключевые показатели', category: 'kpi', description: '', defaultSize: { w: 12, h: 2}, minSize: { w: 6, h: 2}, canHide: false, canResize: true, refreshInterval: 300000},
 { id: 'attendance-today', title: 'Посещаемость сегодня', category: 'kpi', description: '', defaultSize: { w: 4, h: 2}, minSize: { w: 3, h: 2}, canHide: true, canResize: true, refreshInterval: 300000},
 { id: 'finance-overview', title: 'Финансовый обзор', category: 'finance', description: '', defaultSize: { w: 6, h: 3}, minSize: { w: 4, h: 2}, canHide: true, canResize: true, refreshInterval: 600000},
 { id: 'quick-actions', title: 'Быстрые действия', category: 'actions', description: '', defaultSize: { w: 12, h: 1}, minSize: { w: 6, h: 1}, canHide: false, canResize: false, refreshInterval: 0},
 ],
 quickActions: [
 { id: 'add-child', label: 'Добавить ребёнка', icon: 'UserPlus', path: '/children'},
 { id: 'mark-attendance', label: 'Отметить посещаемость', icon: 'CheckSquare', path: '/attendance'},
 ],
 overview: {
 generatedAt: new Date().toISOString(),
 metrics: [
 { id: 'children', label: 'Дети на учёте', value: 150, hint: '145 присутствуют сегодня', tone: 'primary'},
 { id: 'employees', label: 'Активные сотрудники', value: 35, hint: '30 отметок за день', tone: 'success'},
 ],
 alerts: [
 { id: 'maintenance', label: 'Активные заявки', value: 3, tone: 'warning', path: '/maintenance'},
 ],
 visibleWidgetCount: 4,
 quickActionCount: 2,
},
};

const mockKpiData = {
 childrenCount: 150,
 employeesCount: 35,
 activeClubs: 8,
 income: 5000000,
 expense: 3500000,
};

const mockAttendanceData = {
 childrenPresent: 145,
 childrenOnMeals: 140,
 employeeAttendance: { PRESENT: 30, SICK_LEAVE: 2},
 date: '2024-10-15',
};

const mockFinanceData = {
 period: 30,
 income: { total: 5000000, count: 45},
 expense: { total: 3500000, count: 30},
 balance: 1500000,
};

// Мок API
vi.mock('../lib/api', () => ({
 api: {
 get: vi.fn((url: string) => {
 if (url.includes('bootstrap')) return Promise.resolve(mockBootstrap);
 if (url.includes('widgets/kpi-overview')) return Promise.resolve(mockKpiData);
 if (url.includes('widgets/attendance-today')) return Promise.resolve(mockAttendanceData);
 if (url.includes('widgets/finance-overview')) return Promise.resolve(mockFinanceData);
 return Promise.resolve({});
}),
 put: vi.fn(() => Promise.resolve(mockBootstrap.preferences)),
 post: vi.fn(() => Promise.resolve(mockBootstrap.preferences)),
},
}));

// Мок useAuth
vi.mock('../hooks/useAuth', () => ({
 useAuth: () => ({
 user: { id: 1, role: 'ADMIN', email: 'admin@test.com'},
 isAuthenticated: true,
}),
}));

// Мок toast
vi.mock('sonner', () => ({
 toast: {
 success: vi.fn(),
 error: vi.fn(),
},
}));

const renderDashboard = () => {
 return render(
 <BrowserRouter>
 <DashboardPage />
 </BrowserRouter>
 );
};

describe('DashboardPage', () => {
 beforeEach(() => {
 vi.clearAllMocks();
});

 describe('Рендеринг', () => {
 it('показывает заголовок дашборда после загрузки', async () => {
 renderDashboard();

 await waitFor(() => {
 expect(screen.getByText('Дашборд')).toBeInTheDocument();
});
});

 it('отображает overview-метрики после загрузки', async () => {
 renderDashboard();

 await waitFor(() => {
 expect(screen.getByText('Дети на учёте')).toBeInTheDocument();
 expect(screen.getByText('150')).toBeInTheDocument();
});
});

 it('отображает overview-алерты', async () => {
 renderDashboard();

 await waitFor(() => {
 expect(screen.getByText('Активные заявки')).toBeInTheDocument();
});
});
});

 describe('Панель управления', () => {
 it('показывает кнопку редактирования', async () => {
 renderDashboard();

 await waitFor(() => {
 expect(screen.getByText('Редактировать')).toBeInTheDocument();
});
});

 it('показывает кнопку настроек', async () => {
 renderDashboard();

 await waitFor(() => {
 expect(screen.getByText('Настроить')).toBeInTheDocument();
});
});

 it('переключает режим редактирования', async () => {
 renderDashboard();

 await waitFor(() => {
 expect(screen.getByText('Редактировать')).toBeInTheDocument();
});

 await userEvent.click(screen.getByText('Редактировать'));
 expect(screen.getByText('Готово')).toBeInTheDocument();
});
});

 describe('Data Fetching', () => {
 it('загружает bootstrap при монтировании', async () => {
 const { api} = await import('../lib/api');
 renderDashboard();

 await waitFor(() => {
 expect(api.get).toHaveBeenCalledWith('/api/dashboard/bootstrap');
});
});

 it('загружает данные виджетов', async () => {
 const { api} = await import('../lib/api');
 renderDashboard();

 await waitFor(() => {
 expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/api/dashboard/widgets/'));
});
});
});

 describe('Обработка ошибок', () => {
 it('показывает состояние ошибки при провале bootstrap', async () => {
 const { api} = await import('../lib/api');
 vi.mocked(api.get).mockRejectedValueOnce(new Error('API Error'));

 renderDashboard();

 await waitFor(() => {
 expect(screen.getByText('Повторить')).toBeInTheDocument();
});
});
});
});
