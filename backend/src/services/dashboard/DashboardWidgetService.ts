// src/services/dashboard/DashboardWidgetService.ts
// Агрегирующий сервис для данных всех dashboard-виджетов

import { Role } from '@prisma/client';
import { prisma } from '../../prisma';
import {
  DashboardBootstrapPayload,
  DashboardOverviewPayload,
  WIDGET_CATALOGUE,
  getQuickActionsForRole,
} from '../../constants/dashboard';

// ======================== CACHE ========================

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return Promise.resolve(entry.data as T);
  }
  return fn().then(data => {
    cache.set(key, { data, expiresAt: Date.now() + ttlMs });
    return data;
  });
}

// ======================== HELPERS ========================

interface DashboardWidgetContext {
  role: Role;
  userId: number;
  employeeId?: number | null;
  filters?: Record<string, unknown>;
}

type WidgetHandler = (context: DashboardWidgetContext) => Promise<unknown>;

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortObject((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }

  return value;
}

function serializeFilters(filters: Record<string, unknown> = {}) {
  return JSON.stringify(sortObject(filters));
}

function parseNumber(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function isoDate(value: Date) {
  return value.toISOString().split('T')[0];
}

function normalizeActionVerb(action: string) {
  const normalized = action.toLowerCase();

  if (normalized.includes('create') || normalized.includes('add')) {
    return 'create';
  }

  if (normalized.includes('delete') || normalized.includes('remove')) {
    return 'delete';
  }

  if (normalized.includes('setting') || normalized.includes('permission') || normalized.includes('role')) {
    return 'settings';
  }

  return 'update';
}

function toDisplayEntity(details: unknown, fallback: string) {
  if (!details || typeof details !== 'object') {
    return { entity: 'system', entityName: fallback };
  }

  const detailRecord = details as Record<string, unknown>;
  const entity = typeof detailRecord.entity === 'string'
    ? detailRecord.entity
    : typeof detailRecord.module === 'string'
      ? detailRecord.module
      : 'system';

  const entityName = typeof detailRecord.name === 'string'
    ? detailRecord.name
    : typeof detailRecord.title === 'string'
      ? detailRecord.title
      : fallback;

  return { entity, entityName };
}

function toMaintenancePriority(status: string) {
  switch (status) {
    case 'IN_PROGRESS':
      return 'urgent';
    case 'PENDING':
      return 'high';
    default:
      return 'medium';
  }
}

function startOfDay(d: Date = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function endOfDay(d: Date = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
}
function daysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000);
}
function daysAhead(n: number) {
  return new Date(Date.now() + n * 86_400_000);
}

// ======================== WIDGET DATA FETCHERS ========================

class DashboardWidgetServiceClass {
  private widgetHandlers: Record<string, WidgetHandler> = {
    'kpi-overview': async ({ role, employeeId, filters }) => this.getKpiOverview(role, { ...filters, employeeId }),
    'attendance-today': async () => this.getAttendanceToday(),
    'finance-overview': async ({ filters }) => this.getFinanceOverview(filters),
    'cash-forecast': async ({ filters }) => this.getCashForecast(filters),
    'unit-economics': async ({ filters }) => this.getUnitEconomics(filters),
    'inventory-risk': async () => this.getInventoryRisk(),
    'procurement-status': async () => this.getProcurementStatus(),
    'menu-today': async () => this.getMenuToday(),
    'maintenance-queue': async () => this.getMaintenanceQueue(),
    'security-summary': async () => this.getSecuritySummary(),
    'hr-alerts': async () => this.getHrAlerts(),
    'calendar-today': async () => this.getCalendarToday(),
    'notifications-feed': async ({ role }) => this.getNotificationsFeed(role),
    'activity-stream': async () => this.getActivityStream(),
  };

  async getBootstrap(userId: number, role: Role, employeeId?: number | null): Promise<DashboardBootstrapPayload> {
    const [preferences, overview] = await Promise.all([
      prisma.dashboardPreference.findUnique({ where: { userId } }),
      this.getOverview(role, userId, employeeId),
    ]);

    const availableWidgets = WIDGET_CATALOGUE
      .filter(widget => widget.allowedRoles.includes(role))
      .map(({ allowedRoles, dataEndpoint, ...widget }) => widget);

    const quickActions = getQuickActionsForRole(role);

    return {
      preferences: preferences
        ? {
            layout: preferences.layout as any,
            enabledWidgets: preferences.enabledWidgets,
            collapsedSections: preferences.collapsedSections,
            pinnedActions: preferences.pinnedActions,
            widgetFilters: preferences.widgetFilters as any,
            savedViews: preferences.savedViews as any,
            activeView: preferences.activeView,
          }
        : {
            layout: [],
            enabledWidgets: availableWidgets.map(widget => widget.id),
            collapsedSections: [],
            pinnedActions: [],
            widgetFilters: {},
            savedViews: [],
            activeView: null,
          },
      availableWidgets,
      quickActions,
      overview: {
        ...overview,
        visibleWidgetCount: availableWidgets.length,
        quickActionCount: quickActions.length,
      },
    };
  }

  async getWidgetData(widgetId: string, context: DashboardWidgetContext) {
    const handler = this.widgetHandlers[widgetId];
    if (!handler) {
      throw new Error(`Unsupported dashboard widget: ${widgetId}`);
    }

    return handler(context);
  }

  async getOverview(role: Role, userId: number, employeeId?: number | null): Promise<DashboardOverviewPayload> {
    const [kpi, attendance, maintenance, procurement, hr] = await Promise.all([
      this.getKpiOverview(role, { employeeId }),
      this.getAttendanceToday(),
      this.getMaintenanceQueue(),
      this.getProcurementStatus(),
      this.getHrAlerts(),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      visibleWidgetCount: 0,
      quickActionCount: 0,
      metrics: [
        {
          id: 'children',
          label: 'Дети на учёте',
          value: kpi.childrenCount,
          hint: `${attendance.childrenPresent} присутствуют сегодня`,
          tone: 'primary',
        },
        {
          id: 'employees',
          label: 'Активные сотрудники',
          value: kpi.employeesCount,
          hint: `${Object.values(attendance.employeeAttendance).reduce((sum, current) => sum + current, 0)} отметок за день`,
          tone: 'success',
        },
        {
          id: 'clubs',
          label: 'Работающие кружки',
          value: kpi.activeClubs,
          hint: 'Текущий оперативный срез',
          tone: 'primary',
        },
        {
          id: 'balance',
          label: 'Баланс 30 дней',
          value: kpi.income - kpi.expense,
          hint: `Доход ${Math.round(kpi.income).toLocaleString('ru-RU')} / расход ${Math.round(kpi.expense).toLocaleString('ru-RU')}`,
          tone: kpi.income >= kpi.expense ? 'success' : 'danger',
        },
      ],
      alerts: [
        {
          id: 'maintenance',
          label: 'Активные заявки',
          value: maintenance.totalActive,
          tone: maintenance.totalActive > 10 ? 'danger' : 'warning',
          path: '/maintenance',
        },
        {
          id: 'procurement',
          label: 'Открытые закупки',
          value: procurement.totalActive,
          tone: procurement.totalActive > 5 ? 'warning' : 'neutral',
          path: '/procurement',
        },
        {
          id: 'medical',
          label: 'Медосмотры до 30 дней',
          value: hr.medicalExpiring,
          tone: hr.medicalExpiring > 0 ? 'warning' : 'neutral',
          path: '/employees',
        },
        {
          id: 'contracts',
          label: 'Контракты на продление',
          value: hr.contractsExpiring,
          tone: hr.contractsExpiring > 0 ? 'warning' : 'neutral',
          path: '/employees',
        },
      ],
    };
  }

  // ─── KPI Overview ───
  async getKpiOverview(role: Role, filters: Record<string, unknown> = {}) {
    const isTeacher = role === 'TEACHER';
    const employeeId = parseNumber(filters.employeeId, 0) || undefined;

    return cached(`kpi-overview:${role}:${employeeId ?? 'all'}`, 60_000, async () => {
      const [childrenCount, employeesCount, activeClubs, financeLast30d] = await Promise.all([
        prisma.child.count({ where: { status: 'ACTIVE' } }),
        prisma.employee.count({ where: { fireDate: null } }),
        prisma.club.count(isTeacher ? { where: { teacherId: employeeId } } : undefined),
        prisma.financeTransaction.groupBy({
          by: ['type'],
          _sum: { amount: true },
          where: { date: { gte: daysAgo(30) } },
        }),
      ]);

      const income = financeLast30d.find(f => f.type === 'INCOME')?._sum.amount || 0;
      const expense = financeLast30d.find(f => f.type === 'EXPENSE')?._sum.amount || 0;

      return { childrenCount, employeesCount, activeClubs, income: Number(income), expense: Number(expense) };
    });
  }

  // ─── Attendance Today ───
  async getAttendanceToday() {
    return cached('attendance-today', 60_000, async () => {
      const today = startOfDay();
      const tomorrow = endOfDay();

      const [childrenPresent, employeeRecords] = await Promise.all([
        prisma.attendance.count({
          where: { date: { gte: today, lt: tomorrow }, isPresent: true, clubId: null },
        }),
        prisma.employeeAttendance.findMany({
          where: { date: { gte: today, lt: tomorrow } },
          select: { status: true },
        }),
      ]);
      const childrenOnMeals = childrenPresent; // Removed redundant identical query for childrenOnMeals

      const employeeStats = employeeRecords.reduce<Record<string, number>>((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      }, {});

      return {
        childrenPresent,
        childrenOnMeals,
        employeeAttendance: employeeStats,
        date: today.toISOString().split('T')[0],
      };
    });
  }

  // ─── Finance Overview ───
  async getFinanceOverview(filters: Record<string, unknown> = {}) {
    const days = clamp(parseNumber(filters.days, 30), 7, 365);

    return cached(`finance-overview:${days}`, 120_000, async () => {
      const since = daysAgo(days);

      const [byType, byChannel, latestBalances] = await Promise.all([
        prisma.financeTransaction.groupBy({
          by: ['type'],
          _sum: { amount: true },
          _count: true,
          where: { date: { gte: since } },
        }),
        prisma.financeTransaction.groupBy({
          by: ['channel', 'type'],
          _sum: { amount: true },
          _count: true,
          where: { date: { gte: since }, channel: { not: null } },
        }),
        prisma.balanceSnapshot.findMany({
          where: {
            balanceType: { in: ['CASH', 'BANK'] },
          },
          orderBy: { snapshotDate: 'desc' },
          take: 2,
          distinct: ['balanceType'],
          select: { balanceType: true, amount: true, snapshotDate: true },
        }),
      ]);

      const income = byType.find(t => t.type === 'INCOME');
      const expense = byType.find(t => t.type === 'EXPENSE');

      const channelBreakdown = byChannel.map(c => ({
        channel: c.channel,
        type: c.type,
        total: Number(c._sum.amount || 0),
        count: c._count,
      }));

      const cashBalance = latestBalances.find(b => b.balanceType === 'CASH');
      const bankBalance = latestBalances.find(b => b.balanceType === 'BANK');

      return {
        period: days,
        income: { total: Number(income?._sum.amount || 0), count: income?._count || 0 },
        expense: { total: Number(expense?._sum.amount || 0), count: expense?._count || 0 },
        balance: Number(income?._sum.amount || 0) - Number(expense?._sum.amount || 0),
        channelBreakdown,
        balances: {
          cash: cashBalance ? Number(cashBalance.amount) : null,
          bank: bankBalance ? Number(bankBalance.amount) : null,
          snapshotDate: (cashBalance ?? bankBalance)?.snapshotDate?.toISOString() ?? null,
        },
      };
    });
  }

  // ─── Cash Forecast ───
  async getCashForecast(filters: Record<string, unknown> = {}) {
    const forecastDays = clamp(parseNumber(filters.days, 30), 7, 90);

    return cached(`cash-forecast:${forecastDays}`, 300_000, async () => {
      const since = daysAgo(90);
      const totals = await prisma.financeTransaction.groupBy({
        by: ['type'],
        _sum: { amount: true },
        where: { date: { gte: since } },
      });

      const totalIncome90 = Number(totals.find(t => t.type === 'INCOME')?._sum.amount || 0);
      const totalExpense90 = Number(totals.find(t => t.type === 'EXPENSE')?._sum.amount || 0);
      const avgDailyIncome = totalIncome90 / 90;
      const avgDailyExpense = totalExpense90 / 90;

      const days = [];
      let cumulative = 0;
      let forecastTotalIncome = 0;
      let forecastTotalExpense = 0;

      for (let i = 1; i <= forecastDays; i++) {
        const date = new Date(Date.now() + i * 86_400_000);
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const income = isWeekend ? 0 : Math.round(avgDailyIncome);
        const expense = isWeekend ? Math.round(avgDailyExpense * 0.3) : Math.round(avgDailyExpense);
        cumulative += income - expense;
        forecastTotalIncome += income;
        forecastTotalExpense += expense;

        days.push({
          date: date.toISOString().split('T')[0],
          income,
          expense,
          cumulative,
        });
      }

      return {
        days,
        totalIncome: forecastTotalIncome,
        totalExpense: forecastTotalExpense,
        netChange: forecastTotalIncome - forecastTotalExpense,
      };
    });
  }

  // ─── Unit Economics ───
  async getUnitEconomics(filters: Record<string, unknown> = {}) {
    const months = clamp(parseNumber(filters.months, 3), 1, 12);

    return cached(`unit-economics:${months}`, 300_000, async () => {
      const since = new Date();
      since.setMonth(since.getMonth() - months);

      const [childrenCount, transactions] = await Promise.all([
        prisma.child.count({ where: { status: 'ACTIVE' } }),
        prisma.financeTransaction.groupBy({
          by: ['type', 'category'],
          _sum: { amount: true },
          where: { date: { gte: since } },
        }),
      ]);

      const costByCategory: Record<string, number> = {};
      let totalIncome = 0;
      let totalExpense = 0;

      for (const t of transactions) {
        const amount = Number(t._sum.amount || 0);
        if (t.type === 'INCOME') {
          totalIncome += amount;
        } else {
          totalExpense += amount;
          const cat = t.category || 'OTHER';
          costByCategory[cat] = (costByCategory[cat] || 0) + amount;
        }
      }

      const costPerChild = childrenCount > 0 ? Math.round(totalExpense / childrenCount) : 0;

      const breakdown = Object.entries(costByCategory)
        .sort(([, a], [, b]) => b - a)
        .map(([label, amount]) => ({
          label,
          amount: Math.round(amount),
          pct: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
        }));

      return {
        totalCost: Math.round(totalExpense),
        childCount: childrenCount,
        costPerChild,
        breakdown,
      };
    });
  }

  // ─── Inventory Risk ───
  async getInventoryRisk() {
    return cached('inventory-risk', 60_000, async () => {
      const lowItems = await prisma.inventoryItem.findMany({
        where: { quantity: { lt: 10 } },
        orderBy: { quantity: 'asc' },
        take: 10,
        select: { id: true, name: true, quantity: true, unit: true, type: true, minQuantity: true },
      });

      const totalLow = await prisma.inventoryItem.count({ where: { quantity: { lt: 10 } } });

      const critical = lowItems
        .filter(item => item.quantity <= 2)
        .map(item => ({
          id: String(item.id),
          name: item.name,
          currentQty: item.quantity,
          minQty: item.minQuantity ?? 10,
          unit: item.unit,
          daysLeft: item.quantity <= 0 ? 0 : Math.min(item.quantity, 2),
        }));

      const warning = lowItems
        .filter(item => item.quantity > 2)
        .map(item => ({
          id: String(item.id),
          name: item.name,
          currentQty: item.quantity,
          minQty: item.minQuantity ?? 10,
          unit: item.unit,
          daysLeft: Math.min(item.quantity, 7),
        }));

      return { critical, warning, totalLow };
    });
  }

  // ─── Procurement Status ───
  async getProcurementStatus() {
    return cached('procurement-status', 120_000, async () => {
      const [byStatus, totalActive, recentOrders] = await Promise.all([
        prisma.purchaseOrder.groupBy({
          by: ['status'],
          _count: true,
          where: { status: { not: 'DELIVERED' } },
        }),
        prisma.purchaseOrder.count({ where: { status: { not: 'DELIVERED' } } }),
        prisma.purchaseOrder.findMany({
          where: { status: { not: 'DELIVERED' } },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            title: true,
            status: true,
            totalAmount: true,
            type: true,
            supplier: { select: { name: true } },
            orderDate: true,
            createdAt: true,
          },
        }),
      ]);

      return {
        totalActive,
        byStatus: byStatus.map(s => ({ status: s.status.toLowerCase(), count: s._count })),
        recentOrders: recentOrders.map(o => ({
          id: String(o.id),
          supplier: o.supplier?.name || o.title,
          status: o.status.toLowerCase(),
          total: Number(o.totalAmount),
          type: o.type,
          date: (o.orderDate || o.createdAt).toISOString(),
        })),
      };
    });
  }

  // ─── Menu Today ───
  async getMenuToday() {
    return cached('menu-today', 120_000, async () => {
      const today = startOfDay();
      const tomorrow = endOfDay();

      const [todayMenu, childrenOnMeals, totalChildren] = await Promise.all([
        prisma.menuDish.findMany({
          where: {
            menu: { date: { gte: today, lt: tomorrow } },
          },
          include: { dish: { select: { name: true } } },
        }),
        prisma.attendance.count({
          where: { date: { gte: today, lt: tomorrow }, isPresent: true, clubId: null },
        }),
        prisma.child.count({ where: { status: 'ACTIVE' } }),
      ]);

      return {
        date: isoDate(today),
        items: todayMenu.map(m => ({ name: m.dish.name, mealType: m.mealType })),
        childrenOnMeals,
        totalChildren,
      };
    });
  }

  // ─── Maintenance Queue ───
  async getMaintenanceQueue() {
    return cached('maintenance-queue', 60_000, async () => {
      const [byStatus, recent] = await Promise.all([
        prisma.maintenanceRequest.groupBy({
          by: ['status'],
          _count: true,
          where: { status: { in: ['PENDING', 'APPROVED', 'IN_PROGRESS'] } },
        }),
        prisma.maintenanceRequest.findMany({
          where: { status: { in: ['PENDING', 'APPROVED', 'IN_PROGRESS'] } },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            type: true,
            createdAt: true,
            requester: { select: { firstName: true, lastName: true } },
          },
        }),
      ]);

      const totalActive = byStatus.reduce((sum, s) => sum + s._count, 0);

      return {
        totalActive,
        totalOpen: totalActive,
        byStatus: byStatus.map(s => ({ status: s.status.toLowerCase(), count: s._count })),
        recent: recent.map(item => ({
          id: String(item.id),
          title: item.title,
          status: item.status.toLowerCase(),
          priority: toMaintenancePriority(item.status),
          createdAt: item.createdAt.toISOString(),
          requesterName: `${item.requester.firstName} ${item.requester.lastName}`.trim(),
        })),
      };
    });
  }

  // ─── Security Summary ───
  async getSecuritySummary() {
    return cached('security-summary', 300_000, async () => {
      const thirtyDaysAgo = daysAgo(30);
      const today = startOfDay();
      const tomorrow = endOfDay();

      const [recentEvents, byType, todayCount] = await Promise.all([
        prisma.securityLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            eventType: true,
            description: true,
            createdAt: true,
          },
        }),
        prisma.securityLog.groupBy({
          by: ['eventType'],
          _count: true,
          where: { createdAt: { gte: thirtyDaysAgo } },
        }),
        prisma.securityLog.count({
          where: { createdAt: { gte: today, lt: tomorrow } },
        }),
      ]);

      return {
        recentEvents: recentEvents.map(e => ({
          id: String(e.id),
          type: e.eventType.toLowerCase(),
          description: e.description,
          timestamp: e.createdAt.toISOString(),
        })),
        last30Days: byType.map(t => ({ type: t.eventType.toLowerCase(), count: t._count })),
        todayCount,
      };
    });
  }

  // ─── HR Alerts ───
  async getHrAlerts() {
    const threshold = daysAhead(30);
    const today = startOfDay();

    return cached('hr-alerts', 120_000, async () => {
      const [medicalRows, contractRows] = await Promise.all([
        prisma.employee.findMany({
          where: {
            fireDate: null,
            medicalCheckupDate: { not: null, lte: threshold, gte: today },
          },
          select: { id: true, firstName: true, lastName: true, position: true, medicalCheckupDate: true },
          orderBy: { medicalCheckupDate: 'asc' },
          take: 10,
        }),
        prisma.employee.findMany({
          where: {
            fireDate: null,
            contractEndDate: { not: null, lte: threshold, gte: today },
          },
          select: { id: true, firstName: true, lastName: true, position: true, contractEndDate: true },
          orderBy: { contractEndDate: 'asc' },
          take: 10,
        }),
      ]);

      const alerts = [
        ...medicalRows.map(e => ({
          type: 'medical' as const,
          employeeName: `${e.firstName} ${e.lastName}`.trim(),
          detail: e.position ?? 'Мед. осмотр',
          dueDate: e.medicalCheckupDate!.toISOString(),
          overdue: e.medicalCheckupDate! < today,
        })),
        ...contractRows.map(e => ({
          type: 'contract' as const,
          employeeName: `${e.firstName} ${e.lastName}`.trim(),
          detail: e.position ?? 'Контракт',
          dueDate: e.contractEndDate!.toISOString(),
          overdue: e.contractEndDate! < today,
        })),
      ];

      return {
        alerts,
        medicalExpiring: medicalRows.length,
        contractsExpiring: contractRows.length,
      };
    });
  }

  // ─── Calendar Today ───
  async getCalendarToday() {
    const today = startOfDay();
    const tomorrow = endOfDay();

    return cached('calendar-today', 120_000, async () => {
      const events = await prisma.event.findMany({
        where: {
          date: { gte: today, lt: tomorrow },
        },
        orderBy: { date: 'asc' },
        take: 10,
        select: {
          id: true,
          title: true,
          date: true,
          organizer: true,
        },
      });

      return {
        date: today.toISOString().split('T')[0],
        events: events.map(e => ({
          id: String(e.id),
          title: e.title,
          startTime: e.date.toISOString(),
          endTime: e.date.toISOString(),
          organizer: e.organizer,
          type: 'event',
        })),
      };
    });
  }

  // ─── Notifications Feed ───
  async getNotificationsFeed(role: Role) {
    return cached(`notifications-feed:${role}`, 30_000, async () => {
      const notifications = await prisma.notification.findMany({
        where: {
          OR: [{ targetRole: null }, { targetRole: role }],
        },
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: {
          id: true,
          title: true,
          content: true,
          targetRole: true,
          createdAt: true,
        },
      });

      return {
        unreadCount: 0,
        notifications: notifications.map(notification => ({
          id: String(notification.id),
          title: notification.title,
          body: notification.content,
          type: notification.targetRole ? 'warning' : 'info',
          read: true,
          createdAt: notification.createdAt.toISOString(),
        })),
      };
    });
  }

  // ─── Activity Stream ───
  async getActivityStream() {
    return cached('activity-stream', 30_000, async () => {
      const actions = await prisma.actionLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: 20,
        select: {
          id: true,
          action: true,
          details: true,
          timestamp: true,
          user: { select: { email: true, role: true } },
        },
      });

      return {
        entries: actions.map(action => {
          const verb = normalizeActionVerb(action.action);
          const { entity, entityName } = toDisplayEntity(action.details, action.action);

          return {
            id: String(action.id),
            action: verb,
            entity,
            entityName,
            userName: action.user.email,
            timestamp: action.timestamp.toISOString(),
          };
        }),
      };
    });
  }
}

export const dashboardWidgetService = new DashboardWidgetServiceClass();
