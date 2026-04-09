// src/components/dashboard/DashboardLayout.tsx
// Drag-and-drop grid layout для виджетов

import { useMemo, useCallback} from 'react';
import { Responsive, WidthProvider} from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import WidgetRenderer from './WidgetRenderer';
import type { WidgetDefinition, LayoutItem, DashboardPreferences, QuickAction} from '../../types/dashboard';

const ResponsiveGridLayout = WidthProvider(Responsive);

/** Single item in the react-grid-layout */
interface RGLLayout {
 i: string;
 x: number;
 y: number;
 w: number;
 h: number;
 minW?: number;
 minH?: number;
 maxW?: number;
 maxH?: number;
 static?: boolean;
 isResizable?: boolean;
}

interface DashboardLayoutProps {
 preferences: DashboardPreferences;
 availableWidgets: WidgetDefinition[];
 quickActions: QuickAction[];
 isEditMode: boolean;
 onLayoutChange: (layout: LayoutItem[]) => void;
 onToggleCollapse: (widgetId: string) => void;
}

function getQuickActionsHeight(actionCount: number, columns: number) {
 const rows = Math.max(1, Math.ceil(actionCount / columns));
 if (columns >= 5) return Math.max(rows, 2);
 if (columns >= 3) return Math.max(rows, 3);
 return Math.max(rows, 4);
}

/** Конвертирует наш LayoutItem[] в react-grid-layout Layout[] */
function toGridLayout(items: LayoutItem[], widgets: WidgetDefinition[]): RGLLayout[] {
 return items.map(item => {
 const def = widgets.find(w => w.id === item.widgetId);
 return {
 i: item.widgetId,
 x: item.x,
 y: item.y,
 w: item.w,
 h: item.h,
 minW: def?.minSize.w ?? 2,
 minH: def?.minSize.h ?? 1,
 maxW: def?.maxSize.w ?? 12,
 maxH: def?.maxSize.h ?? 8,
 static: !def?.canResize && !def?.canHide,
 isResizable: def?.canResize ?? true,
};
});
}

/** Конвертирует react-grid-layout Layout[] обратно в LayoutItem[] */
function fromGridLayout(gridLayout: RGLLayout[]): LayoutItem[] {
 return gridLayout.map(item => ({
 widgetId: item.i,
 x: item.x,
 y: item.y,
 w: item.w,
 h: item.h,
}));
}

export default function DashboardLayout({
 preferences,
 availableWidgets,
 quickActions,
 isEditMode,
 onLayoutChange,
 onToggleCollapse,
}: DashboardLayoutProps) {
 // Фильтруем виджеты: только enabled и доступные
 const visibleWidgets = useMemo(() => {
 return availableWidgets.filter(w => preferences.enabledWidgets.includes(w.id));
}, [availableWidgets, preferences.enabledWidgets]);

 // Собираем layout: для видимых виджетов без layout-записи генерируем позиции
 const visibleLayout = useMemo(() => {
 const existing = preferences.layout.filter(item =>
 visibleWidgets.some(w => w.id === item.widgetId)
 );
 const existingIds = new Set(existing.map(item => item.widgetId));
 const maxY = existing.reduce((max, item) => Math.max(max, item.y + item.h), 0);

 let offsetY = maxY;
 const generated: LayoutItem[] = [];
 for (const w of visibleWidgets) {
 if (!existingIds.has(w.id)) {
 generated.push({
 widgetId: w.id,
 x: 0,
 y: offsetY,
 w: w.defaultSize.w,
 h: w.defaultSize.h,
});
 offsetY += w.defaultSize.h;
}
}

 return [...existing, ...generated];
}, [preferences.layout, visibleWidgets]);

 const gridLayout = useMemo(
 () => toGridLayout(visibleLayout, availableWidgets),
 [visibleLayout, availableWidgets]
 );

 const quickActionsCount = quickActions.length;

 const layouts: Record<string, RGLLayout[]> = useMemo(() => ({
 lg: gridLayout.map(item => item.i === 'quick-actions'
 ? { ...item, h: getQuickActionsHeight(quickActionsCount, 5)}
 : item),
 md: gridLayout.map(item => item.i === 'quick-actions'
 ? { ...item, w: 6, h: getQuickActionsHeight(quickActionsCount, 3)}
 : { ...item, w: Math.min(item.w, 6)}),
 sm: gridLayout.map(item => item.i === 'quick-actions'
 ? { ...item, w: 6, x: 0, h: getQuickActionsHeight(quickActionsCount, 2)}
 : { ...item, w: 6, x: 0}),
 xs: gridLayout.map(item => item.i === 'quick-actions'
 ? { ...item, w: 6, x: 0, h: getQuickActionsHeight(quickActionsCount, 2)}
 : { ...item, w: 6, x: 0}),
}), [gridLayout, quickActionsCount]);

 const handleLayoutChange = useCallback(
 (currentLayout: RGLLayout[]) => {
 onLayoutChange(fromGridLayout(currentLayout));
},
 [onLayoutChange]
 );

 return (
 <ResponsiveGridLayout
 className="dashboard-grid"
 layouts={layouts}
 breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480}}
 cols={{ lg: 12, md: 6, sm: 6, xs: 6}}
 rowHeight={80}
 isDraggable={isEditMode}
 isResizable={isEditMode}
 onLayoutChange={handleLayoutChange}
 draggableHandle=".bento-card__header"
 compactType="vertical"
 margin={[16, 16]}
 >
 {visibleWidgets.map(widget => (
 <div key={widget.id}>
 <WidgetRenderer
 definition={widget}
 isCollapsed={preferences.collapsedSections.includes(widget.id)}
 isEditMode={isEditMode}
 onToggleCollapse={() => onToggleCollapse(widget.id)}
 filters={(preferences.widgetFilters[widget.id] as Record<string, unknown>) || undefined}
 quickActionsData={widget.id === 'quick-actions' ? quickActions : undefined}
 pinnedActions={widget.id === 'quick-actions' ? preferences.pinnedActions : undefined}
 />
 </div>
 ))}
 </ResponsiveGridLayout>
 );
}
