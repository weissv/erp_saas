// src/services/dashboard/DashboardPreferencesService.ts
import { prisma } from '../../prisma';
import { Role } from '@prisma/client';
import {
  DashboardPreferencesPayload,
  LayoutItem,
  SavedView,
  WidgetFilters,
  getDefaultLayout,
  getWidgetsForRole,
  WIDGET_CATALOGUE,
} from '../../constants/dashboard';

class DashboardPreferencesServiceClass {
  /**
   * Получить preferences пользователя (или default по роли)
   */
  async get(userId: number, role: Role): Promise<DashboardPreferencesPayload> {
    const record = await prisma.dashboardPreference.findUnique({
      where: { userId },
    });

    if (!record) {
      return this.getDefaults(role);
    }

    return {
      layout: record.layout as unknown as LayoutItem[],
      enabledWidgets: record.enabledWidgets,
      collapsedSections: record.collapsedSections,
      pinnedActions: record.pinnedActions,
      widgetFilters: record.widgetFilters as unknown as WidgetFilters,
      savedViews: record.savedViews as unknown as SavedView[],
      activeView: record.activeView,
    };
  }

  /**
   * Сохранить или обновить preferences (полная перезапись)
   */
  async save(userId: number, role: Role, data: Partial<DashboardPreferencesPayload>): Promise<DashboardPreferencesPayload> {
    const current = await this.get(userId, role);
    const allowedWidgetIds = getWidgetsForRole(role);

    // Фильтруем enabledWidgets только по доступным
    const enabledWidgets = (data.enabledWidgets ?? current.enabledWidgets)
      .filter(id => allowedWidgetIds.includes(id));

    // Фильтруем layout: оставляем только доступные виджеты
    const layout = (data.layout ?? current.layout)
      .filter(item => allowedWidgetIds.includes(item.widgetId));

    // Не позволяем скрыть обязательные виджеты
    const requiredWidgets = WIDGET_CATALOGUE.filter(w => !w.canHide).map(w => w.id);
    for (const rw of requiredWidgets) {
      if (allowedWidgetIds.includes(rw) && !enabledWidgets.includes(rw)) {
        enabledWidgets.push(rw);
      }
    }

    const merged: DashboardPreferencesPayload = {
      layout,
      enabledWidgets,
      collapsedSections: data.collapsedSections ?? current.collapsedSections,
      pinnedActions: data.pinnedActions ?? current.pinnedActions,
      widgetFilters: data.widgetFilters ?? current.widgetFilters,
      savedViews: data.savedViews ?? current.savedViews,
      activeView: data.activeView !== undefined ? data.activeView : current.activeView,
    };

    await prisma.dashboardPreference.upsert({
      where: { userId },
      update: {
        layout: merged.layout as any,
        enabledWidgets: merged.enabledWidgets,
        collapsedSections: merged.collapsedSections,
        pinnedActions: merged.pinnedActions,
        widgetFilters: merged.widgetFilters as any,
        savedViews: merged.savedViews as any,
        activeView: merged.activeView,
      },
      create: {
        userId,
        layout: merged.layout as any,
        enabledWidgets: merged.enabledWidgets,
        collapsedSections: merged.collapsedSections,
        pinnedActions: merged.pinnedActions,
        widgetFilters: merged.widgetFilters as any,
        savedViews: merged.savedViews as any,
        activeView: merged.activeView,
      },
    });

    return merged;
  }

  /**
   * Сбросить preferences к значениям по умолчанию
   */
  async reset(userId: number, role: Role): Promise<DashboardPreferencesPayload> {
    await prisma.dashboardPreference.deleteMany({ where: { userId } });
    return this.getDefaults(role);
  }

  /**
   * Значения по умолчанию для данной роли
   */
  private getDefaults(role: Role): DashboardPreferencesPayload {
    return {
      layout: getDefaultLayout(role),
      enabledWidgets: getWidgetsForRole(role),
      collapsedSections: [],
      pinnedActions: [],
      widgetFilters: {},
      savedViews: [],
      activeView: null,
    };
  }
}

export const dashboardPreferencesService = new DashboardPreferencesServiceClass();
