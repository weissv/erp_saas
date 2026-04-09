// src/types/dashboard.ts
// Frontend типы для модульного дашборда

// ======================== WIDGET CATEGORIES ========================

export type WidgetCategory =
  | 'kpi'
  | 'finance'
  | 'operations'
  | 'hr'
  | 'alerts'
  | 'activity'
  | 'actions';

// ======================== WIDGET DEFINITION ========================

export interface WidgetDefinition {
  id: string;
  title: string;
  category: WidgetCategory;
  description: string;
  defaultSize: { w: number; h: number };
  minSize: { w: number; h: number };
  maxSize: { w: number; h: number };
  canHide: boolean;
  canResize: boolean;
  refreshInterval: number;
}

// ======================== LAYOUT ITEM ========================

export interface LayoutItem {
  widgetId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

// ======================== WIDGET FILTER ========================

export interface WidgetFilters {
  [widgetId: string]: Record<string, unknown>;
}

// ======================== SAVED VIEW ========================

export interface SavedView {
  id: string;
  name: string;
  layout: LayoutItem[];
  enabledWidgets: string[];
  widgetFilters?: WidgetFilters;
  createdAt: string;
}

// ======================== USER PREFERENCES ========================

export interface DashboardPreferences {
  layout: LayoutItem[];
  enabledWidgets: string[];
  collapsedSections: string[];
  pinnedActions: string[];
  widgetFilters: WidgetFilters;
  savedViews: SavedView[];
  activeView: string | null;
}

// ======================== QUICK ACTION ========================

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  path: string;
}

// ======================== OVERVIEW ========================

export interface OverviewMetric {
  id: string;
  label: string;
  value: number;
  hint: string;
  tone: 'primary' | 'success' | 'warning' | 'danger';
}

export interface OverviewAlert {
  id: string;
  label: string;
  value: number;
  tone: 'neutral' | 'warning' | 'danger';
  path: string;
}

export interface DashboardOverview {
  generatedAt: string;
  metrics: OverviewMetric[];
  alerts: OverviewAlert[];
  visibleWidgetCount: number;
  quickActionCount: number;
}

// ======================== BOOTSTRAP RESPONSE ========================

export interface DashboardBootstrap {
  preferences: DashboardPreferences;
  availableWidgets: WidgetDefinition[];
  quickActions: QuickAction[];
  overview: DashboardOverview;
}

// ======================== WIDGET DATA STATE ========================

export interface WidgetDataState<T = unknown> {
  data: T | undefined;
  isLoading: boolean;
  error: string | undefined;
  lastUpdated: number | null;
}
