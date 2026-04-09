// src/components/dashboard/WidgetRenderer.tsx
// Рендерит виджет по его id, подключая данные и WidgetChrome

import { lazy, Suspense} from 'react';
import WidgetChrome from './WidgetChrome';
import { useWidgetData} from '../../hooks/useWidgetData';
import type { WidgetDefinition, WidgetFilters} from '../../types/dashboard';

// ─── Lazy-loaded widget components ───
import KpiOverviewWidget from './widgets/KpiOverviewWidget';
import AttendanceTodayWidget from './widgets/AttendanceTodayWidget';
import FinanceOverviewWidget from './widgets/FinanceOverviewWidget';
import CashForecastWidget from './widgets/CashForecastWidget';
import UnitEconomicsWidget from './widgets/UnitEconomicsWidget';
import InventoryRiskWidget from './widgets/InventoryRiskWidget';
import ProcurementStatusWidget from './widgets/ProcurementStatusWidget';
import MenuTodayWidget from './widgets/MenuTodayWidget';
import MaintenanceQueueWidget from './widgets/MaintenanceQueueWidget';
import SecuritySummaryWidget from './widgets/SecuritySummaryWidget';
import HrAlertsWidget from './widgets/HrAlertsWidget';
import CalendarTodayWidget from './widgets/CalendarTodayWidget';
import NotificationsFeedWidget from './widgets/NotificationsFeedWidget';
import ActivityStreamWidget from './widgets/ActivityStreamWidget';
import QuickActionsWidget from './widgets/QuickActionsWidget';

// Маппинг id -> компонент
const WIDGET_COMPONENTS: Record<string, React.ComponentType<{ data: any}>> = {
 'kpi-overview': KpiOverviewWidget,
 'attendance-today': AttendanceTodayWidget,
 'finance-overview': FinanceOverviewWidget,
 'cash-forecast': CashForecastWidget,
 'unit-economics': UnitEconomicsWidget,
 'inventory-risk': InventoryRiskWidget,
 'procurement-status': ProcurementStatusWidget,
 'menu-today': MenuTodayWidget,
 'maintenance-queue': MaintenanceQueueWidget,
 'security-summary': SecuritySummaryWidget,
 'hr-alerts': HrAlertsWidget,
 'calendar-today': CalendarTodayWidget,
 'notifications-feed': NotificationsFeedWidget,
 'activity-stream': ActivityStreamWidget,
 'quick-actions': QuickActionsWidget,
};

// Deep links в ERP-модули
const WIDGET_DEEP_LINKS: Record<string, string> = {
 'finance-overview': '/finance',
 'cash-forecast': '/finance',
 'unit-economics': '/finance',
 'inventory-risk': '/inventory',
 'procurement-status': '/procurement',
 'menu-today': '/menu',
 'maintenance-queue': '/maintenance',
 'security-summary': '/security',
 'hr-alerts': '/employees',
 'calendar-today': '/calendar',
 'notifications-feed': '/notifications',
 'activity-stream': '/action-log',
 'attendance-today': '/attendance',
};

interface WidgetRendererProps {
 definition: WidgetDefinition;
 isCollapsed?: boolean;
 isEditMode?: boolean;
 onToggleCollapse?: () => void;
 filters?: Record<string, unknown>;
 /** Быстрые действия передаются как data для quick-actions */
 quickActionsData?: any;
 /** Закреплённые действия */
 pinnedActions?: string[];
}

export default function WidgetRenderer({
 definition,
 isCollapsed,
 isEditMode,
 onToggleCollapse,
 filters,
 quickActionsData,
 pinnedActions,
}: WidgetRendererProps) {
 const isQuickActions = definition.id === 'quick-actions';

 // Для quick-actions не нужен fetch данных
 const { data, isLoading, error, refetch} = useWidgetData({
 widgetId: definition.id,
 enabled: !isQuickActions,
 refreshInterval: definition.refreshInterval,
 filters,
});

 const Component = WIDGET_COMPONENTS[definition.id];

 if (!Component) {
 return (
 <WidgetChrome title={definition.title} category={definition.category}>
 <p className="text-sm text-tertiary">Виджет «{definition.title}» ещё не реализован</p>
 </WidgetChrome>
 );
}

 return (
 <WidgetChrome
 title={definition.title}
 category={definition.category}
 isLoading={isLoading}
 error={error}
 isCollapsed={isCollapsed}
 isEditMode={isEditMode}
 onToggleCollapse={onToggleCollapse}
 onRefresh={refetch}
 deepLink={WIDGET_DEEP_LINKS[definition.id]}
 >
 <Component data={isQuickActions ? { actions: quickActionsData, pinnedActions} : data} />
 </WidgetChrome>
 );
}
