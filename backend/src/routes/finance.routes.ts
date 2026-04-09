// src/routes/finance.routes.ts
import { Router } from "express";
import type { z } from "zod";
import { prisma } from "../prisma";
import { checkRole } from "../middleware/checkRole";
import { validate } from "../middleware/validate";
import { buildPagination, buildOrderBy, buildWhere } from "../utils/query";
import {
  getOneCBalances,
  listOneCDebtors,
  listOneCInvoices,
  oneCFinanceAllowedRoles,
} from "../modules/onec/services/onec-finance.service";
import {
  listFinanceSchema,
  reportFinanceSchema,
  summaryFinanceSchema,
  listInvoicesSchema,
  listBalancesSchema,
  listDebtorsSchema,
} from "../schemas/finance.schema";

const router = Router();

type ListFinanceQuery = z.infer<typeof listFinanceSchema>["query"];
type SummaryFinanceQuery = z.infer<typeof summaryFinanceSchema>["query"];
type ReportFinanceQuery = z.infer<typeof reportFinanceSchema>["query"];
type ListInvoicesQuery = z.infer<typeof listInvoicesSchema>["query"];
type ListBalancesQuery = z.infer<typeof listBalancesSchema>["query"];
type ListDebtorsQuery = z.infer<typeof listDebtorsSchema>["query"];

const isValidDate = (value: unknown): value is Date => value instanceof Date && !Number.isNaN(value.getTime());

const coerceDate = (value: unknown) => {
  if (value instanceof Date) return isValidDate(value) ? value : null;
  if (value === undefined || value === null || value === "") return null;
  const parsed = new Date(String(value));
  return isValidDate(parsed) ? parsed : null;
};

const appendDateRange = (where: Record<string, any>, start?: unknown, end?: unknown, field = "date") => {
  const startDate = coerceDate(start);
  const endDate = coerceDate(end);
  if (!startDate && !endDate) return;
  where[field] = {};
  if (startDate) where[field].gte = startDate;
  if (endDate) where[field].lte = endDate;
};

// GET /api/finance/transactions
router.get(
  "/transactions",
  checkRole(["ACCOUNTANT", "DEPUTY", "ADMIN"]),
  validate(listFinanceSchema),
  async (req, res) => {
    const query = req.query as ListFinanceQuery;
    const { skip, take } = buildPagination(query);
    const orderBy = buildOrderBy(query, ["date", "amount", "category", "type", "source", "id", "channel"]);
    const where = buildWhere<any>(query, ["type", "category", "channel"]);
    appendDateRange(where, query.startDate, query.endDate);

    if (query.posted !== undefined) {
      where.posted = query.posted === "true";
    }
    if (query.contractorId) {
      where.contractorId = Number(query.contractorId);
    }
    if (query.personId) {
      where.personId = Number(query.personId);
    }
    if (query.cashFlowArticleId) {
      where.cashFlowArticleId = Number(query.cashFlowArticleId);
    }
    if (query.search) {
      where.OR = [
        { description: { contains: query.search, mode: "insensitive" } },
        { documentNumber: { contains: query.search, mode: "insensitive" } },
        { purpose: { contains: query.search, mode: "insensitive" } },
        { contractor: { name: { contains: query.search, mode: "insensitive" } } },
        { person: { name: { contains: query.search, mode: "insensitive" } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.financeTransaction.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          club: { select: { name: true } },
          contractor: { select: { id: true, name: true, inn: true } },
          person: { select: { id: true, name: true } },
          cashFlowArticle: { select: { id: true, name: true } },
        },
      }),
      prisma.financeTransaction.count({ where }),
    ]);
    return res.json({ items, total });
  }
);

// GET /api/finance/contractors — справочник контрагентов для фильтрации
router.get(
  "/contractors",
  checkRole(["ACCOUNTANT", "DEPUTY", "ADMIN"]),
  async (_req, res) => {
    const items = await prisma.contractor.findMany({
      where: { isActive: true, isFolder: false },
      select: { id: true, name: true, inn: true },
      orderBy: { name: "asc" },
    });
    return res.json(items);
  }
);

// GET /api/finance/persons — справочник физлиц для фильтрации
router.get(
  "/persons",
  checkRole(["ACCOUNTANT", "DEPUTY", "ADMIN"]),
  async (_req, res) => {
    const items = await prisma.person.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return res.json(items);
  }
);

// GET /api/finance/cash-flow-articles — статьи ДДС для фильтрации
router.get(
  "/cash-flow-articles",
  checkRole(["ACCOUNTANT", "DEPUTY", "ADMIN"]),
  async (_req, res) => {
    const items = await prisma.cashFlowArticle.findMany({
      where: { isFolder: false },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return res.json(items);
  }
);

// =====================================================
// INVOICES — Товарные документы (Поступление / Реализация)
// =====================================================

// GET /api/finance/invoices
router.get(
  "/invoices",
  checkRole(oneCFinanceAllowedRoles),
  validate(listInvoicesSchema),
  async (req, res) => {
    return res.json(await listOneCInvoices(req.query as ListInvoicesQuery));
  }
);

// =====================================================
// BALANCES — Агрегированные остатки
// =====================================================

// GET /api/finance/balances
router.get(
  "/balances",
  checkRole(oneCFinanceAllowedRoles),
  validate(listBalancesSchema),
  async (req, res) => {
    return res.json(await getOneCBalances(req.query as ListBalancesQuery));
  }
);

// =====================================================
// DEBTORS — Топ-дебиторы (сальдо с контрагентами)
// =====================================================

// GET /api/finance/debtors
router.get(
  "/debtors",
  checkRole(oneCFinanceAllowedRoles),
  validate(listDebtorsSchema),
  async (req, res) => {
    return res.json(await listOneCDebtors(req.query as ListDebtorsQuery));
  }
);

// GET /api/finance/reports?period=month&category=CLUBS&channel=CASH
router.get(
  "/reports",
  checkRole(["ACCOUNTANT", "DEPUTY", "ADMIN"]),
  validate(reportFinanceSchema),
  async (req, res) => {
    const { period = "month", category, channel } = req.query as ReportFinanceQuery;
  const now = new Date();
  const start =
    period === "month"
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : new Date(now.getFullYear(), 0, 1);

  const where: any = { date: { gte: start } };
  if (category) where.category = String(category);
  if (channel) where.channel = String(channel);

  const grouped = await prisma.financeTransaction.groupBy({
    by: ["type", "category"],
    _sum: { amount: true },
    where,
  });

    return res.json({ from: start, to: now, grouped });
  }
);

// GET /api/finance/reports/summary - сводный отчет с группировкой
router.get(
  "/reports/summary",
  checkRole(["ACCOUNTANT", "DEPUTY", "ADMIN"]),
  validate(summaryFinanceSchema),
  async (req, res) => {
    const { startDate, endDate, groupBy = "month", channel } = req.query as SummaryFinanceQuery;
  
    const where: Record<string, any> = {};
    appendDateRange(where, startDate, endDate);
    if (channel) where.channel = String(channel);

    const invoiceWhere: Record<string, any> = {};
    appendDateRange(invoiceWhere, startDate, endDate);

  // Группировка по категории, типу, источнику, каналу
  const [byCategory, byType, bySource, byChannel, totals, invoiceTotals] = await Promise.all([
    prisma.financeTransaction.groupBy({
      by: ["category"],
      _sum: { amount: true },
      _count: { id: true },
      where,
    }),
    prisma.financeTransaction.groupBy({
      by: ["type"],
      _sum: { amount: true },
      _count: { id: true },
      where,
    }),
    prisma.financeTransaction.groupBy({
      by: ["source"],
      _sum: { amount: true },
      _count: { id: true },
      where,
    }),
    prisma.financeTransaction.groupBy({
      by: ["channel"],
      _sum: { amount: true },
      _count: { id: true },
      where,
    }),
    prisma.financeTransaction.aggregate({
      _sum: { amount: true },
      _count: { id: true },
      where,
    }),
    prisma.invoice.aggregate({
      _sum: { totalAmount: true },
      _count: { id: true },
      where: invoiceWhere,
    }),
  ]);

    return res.json({
      period: { startDate, endDate },
    totals: {
      totalAmount: totals._sum.amount || 0,
      totalTransactions: totals._count.id,
      totalInvoices: invoiceTotals._count.id,
      totalDocuments: totals._count.id + invoiceTotals._count.id,
      totalInvoiceAmount: invoiceTotals._sum.totalAmount || 0,
    },
    byCategory,
    byType,
    bySource,
    byChannel,
    });
  }
);

// GET /api/finance/export - экспорт в CSV
router.get(
  "/export",
  checkRole(["ACCOUNTANT", "DEPUTY", "ADMIN"]),
  validate(summaryFinanceSchema),
  async (req, res) => {
    const { startDate, endDate } = req.query as SummaryFinanceQuery;
  
    const where: Record<string, any> = {};
    appendDateRange(where, startDate, endDate);

  const transactions = await prisma.financeTransaction.findMany({
    where,
    orderBy: { date: "desc" },
    include: {
      club: { select: { name: true } },
      contractor: { select: { name: true } },
      person: { select: { name: true } },
      cashFlowArticle: { select: { name: true } },
    },
  });

  // Формируем CSV
  const header = "ID,Дата,Тип,Категория,Канал,Источник,Номер документа,Сумма,Описание,Контрагент,Физлицо,Статья ДДС,Кружок\n";
  const rows = transactions.map((t: any) => {
    const date = new Date(t.date).toISOString().split("T")[0];
    const club = t.club?.name || "";
    const contractor = t.contractor?.name || "";
    const person = t.person?.name || "";
    const article = t.cashFlowArticle?.name || "";
    return `${t.id},${date},${t.type},${t.category},${t.channel || ""},${t.source || ""},${t.documentNumber || ""},${t.amount},"${t.description || ""}","${contractor}","${person}","${article}","${club}"`;
  }).join("\n");

  const csv = header + rows;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=finance_export_${new Date().toISOString().split("T")[0]}.csv`
    );
    return res.send("\uFEFF" + csv); // BOM для правильной кодировки в Excel
  }
);

// =====================================================
// UNIT-ЭКОНОМИКА: Расчёт стоимости одного ребёнка
// =====================================================

interface UnitEconomicsResult {
  period: { startDate: Date; endDate: Date; days: number; workingDays: number };
  children: { total: number; avgDaily: number };
  costs: {
    nutrition: { total: number; perChild: number; perChildDaily: number };
    salary: { total: number; perChild: number; perChildDaily: number };
    maintenance: { total: number; perChild: number; perChildDaily: number };
    clubs: { total: number; perChild: number; perChildDaily: number };
    other: { total: number; perChild: number; perChildDaily: number };
    depreciation: { total: number; perChild: number; perChildDaily: number };
  };
  totals: {
    totalCost: number;
    costPerChild: number;
    costPerChildDaily: number;
    costPerChildMonthly: number;
  };
  income: {
    total: number;
    perChild: number;
    margin: number;
    marginPercent: number;
  };
}

// GET /api/finance/unit-economics - Калькулятор Unit-экономики
router.get(
  "/unit-economics",
  checkRole(["DIRECTOR", "DEPUTY", "ADMIN", "ACCOUNTANT"]),
  async (req, res) => {
    const { months = "3", depreciationMonthly = "5000000" } = req.query;
    const monthsCount = Math.min(Math.max(1, Number(months) || 3), 12);
    const depreciation = Number(depreciationMonthly) || 5000000; // Амортизация в месяц по умолчанию

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsCount);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    // Считаем рабочие дни (Пн-Пт)
    let workingDays = 0;
    const tempDate = new Date(startDate);
    while (tempDate <= endDate) {
      const dayOfWeek = tempDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) workingDays++;
      tempDate.setDate(tempDate.getDate() + 1);
    }

    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Получаем данные
    const [
      activeChildren,
      expensesByCategory,
      incomeTotal,
      avgAttendance,
    ] = await Promise.all([
      // Активные дети
      prisma.child.count({ where: { status: "ACTIVE" } }),

      // Расходы по категориям за период
      prisma.financeTransaction.groupBy({
        by: ["category"],
        _sum: { amount: true },
        where: {
          type: "EXPENSE",
          date: { gte: startDate, lte: endDate },
        },
      }),

      // Доходы за период
      prisma.financeTransaction.aggregate({
        _sum: { amount: true },
        where: {
          type: "INCOME",
          date: { gte: startDate, lte: endDate },
        },
      }),

      // Средняя посещаемость
      prisma.attendance.groupBy({
        by: ["date"],
        _count: { id: true },
        where: {
          date: { gte: startDate, lte: endDate },
          clubId: null,
          isPresent: true,
        },
      }),
    ]);

    // Рассчитываем среднюю посещаемость
    const totalAttendance = avgAttendance.reduce((sum, day) => sum + day._count.id, 0);
    const daysWithAttendance = avgAttendance.length || 1;
    const avgDailyAttendance = Math.round(totalAttendance / daysWithAttendance);

    // Расходы по категориям
    const getCategorySum = (cat: string) => {
      const found = expensesByCategory.find((e) => e.category === cat);
      return Number(found?._sum.amount) || 0;
    };

    const nutritionCost = getCategorySum("NUTRITION");
    const salaryCost = getCategorySum("SALARY");
    const maintenanceCost = getCategorySum("MAINTENANCE");
    const clubsCost = getCategorySum("CLUBS");
    
    // Остальные расходы
    const knownCategories = ["NUTRITION", "SALARY", "MAINTENANCE", "CLUBS"];
    const otherCost = expensesByCategory
      .filter((e) => !knownCategories.includes(e.category))
      .reduce((sum, e) => sum + (Number(e._sum.amount) || 0), 0);

    // Амортизация за период
    const depreciationCost = depreciation * monthsCount;

    // Общие расходы
    const totalCost = nutritionCost + salaryCost + maintenanceCost + clubsCost + otherCost + depreciationCost;
    const childCount = activeChildren || 1;

    // Расчёт на одного ребёнка
    const perChild = (cost: number) => Math.round(cost / childCount);
    const perChildDaily = (cost: number) => Math.round(cost / childCount / workingDays);

    const income = Number(incomeTotal._sum.amount) || 0;
    const margin = income - totalCost;
    const marginPercent = income > 0 ? Math.round((margin / income) * 100) : 0;

    const result: UnitEconomicsResult = {
      period: {
        startDate,
        endDate,
        days: totalDays,
        workingDays,
      },
      children: {
        total: activeChildren,
        avgDaily: avgDailyAttendance,
      },
      costs: {
        nutrition: {
          total: nutritionCost,
          perChild: perChild(nutritionCost),
          perChildDaily: perChildDaily(nutritionCost),
        },
        salary: {
          total: salaryCost,
          perChild: perChild(salaryCost),
          perChildDaily: perChildDaily(salaryCost),
        },
        maintenance: {
          total: maintenanceCost,
          perChild: perChild(maintenanceCost),
          perChildDaily: perChildDaily(maintenanceCost),
        },
        clubs: {
          total: clubsCost,
          perChild: perChild(clubsCost),
          perChildDaily: perChildDaily(clubsCost),
        },
        other: {
          total: otherCost,
          perChild: perChild(otherCost),
          perChildDaily: perChildDaily(otherCost),
        },
        depreciation: {
          total: depreciationCost,
          perChild: perChild(depreciationCost),
          perChildDaily: perChildDaily(depreciationCost),
        },
      },
      totals: {
        totalCost,
        costPerChild: perChild(totalCost),
        costPerChildDaily: perChildDaily(totalCost),
        costPerChildMonthly: Math.round(perChild(totalCost) / monthsCount),
      },
      income: {
        total: income,
        perChild: perChild(income),
        margin,
        marginPercent,
      },
    };

    return res.json(result);
  }
);

// =====================================================
// ПРОГНОЗ КАССОВЫХ РАЗРЫВОВ
// =====================================================

interface CashFlowForecast {
  currentBalance: number;
  forecast: Array<{
    date: string;
    dayOfWeek: number;
    dayName: string;
    expectedIncome: number;
    expectedExpense: number;
    netFlow: number;
    runningBalance: number;
    isGap: boolean;
    gapAmount?: number;
  }>;
  summary: {
    totalExpectedIncome: number;
    totalExpectedExpense: number;
    netCashFlow: number;
    daysWithGaps: number;
    maxGapAmount: number;
    minBalance: number;
    recommendations: string[];
  };
}

// GET /api/finance/cash-forecast - Прогноз кассовых разрывов
router.get(
  "/cash-forecast",
  checkRole(["DIRECTOR", "DEPUTY", "ADMIN", "ACCOUNTANT"]),
  async (req, res) => {
    const { days = "30", currentBalance = "0" } = req.query;
    const forecastDays = Math.min(Math.max(7, Number(days) || 30), 90);
    const startBalance = Number(currentBalance) || 0;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + forecastDays);

    // Получаем исторические данные за последние 3 месяца для прогноза
    const historyStart = new Date(today);
    historyStart.setMonth(historyStart.getMonth() - 3);

    const [
      historicalData,
      upcomingSalaryDate,
      activeChildren,
      employeesCount,
      scheduledPurchases,
    ] = await Promise.all([
      // История транзакций по дням недели
      prisma.financeTransaction.findMany({
        where: {
          date: { gte: historyStart, lt: today },
        },
        select: {
          date: true,
          type: true,
          amount: true,
          category: true,
        },
      }),

      // Ближайшая дата зарплаты (обычно 5 и 20 числа)
      Promise.resolve(null), // Placeholder

      // Активные дети (для прогноза платежей)
      prisma.child.count({ where: { status: "ACTIVE" } }),

      // Количество сотрудников (для прогноза зарплат)
      prisma.employee.count({ where: { fireDate: null } }),

      // Запланированные закупки
      prisma.purchaseOrder.findMany({
        where: {
          status: { in: ["PENDING", "APPROVED"] },
          expectedDeliveryDate: { gte: today, lte: endDate },
        },
        select: {
          expectedDeliveryDate: true,
          totalAmount: true,
        },
      }),
    ]);

    // Анализ исторических данных по дням недели
    const dayOfWeekStats: Record<number, { income: number[]; expense: number[] }> = {};
    for (let i = 0; i < 7; i++) {
      dayOfWeekStats[i] = { income: [], expense: [] };
    }

    for (const tx of historicalData) {
      const dow = new Date(tx.date).getDay();
      const amount = Number(tx.amount) || 0;
      if (tx.type === "INCOME") {
        dayOfWeekStats[dow].income.push(amount);
      } else {
        dayOfWeekStats[dow].expense.push(amount);
      }
    }

    // Средние значения по дням недели
    const getAvg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const avgByDay: Record<number, { avgIncome: number; avgExpense: number }> = {};
    for (let i = 0; i < 7; i++) {
      avgByDay[i] = {
        avgIncome: Math.round(getAvg(dayOfWeekStats[i].income)),
        avgExpense: Math.round(getAvg(dayOfWeekStats[i].expense)),
      };
    }

    // Определяем даты зарплат (5 и 20 число каждого месяца)
    const salaryDates = new Set<string>();
    const tempDate = new Date(today);
    while (tempDate <= endDate) {
      const dayOfMonth = tempDate.getDate();
      if (dayOfMonth === 5 || dayOfMonth === 20) {
        salaryDates.add(tempDate.toISOString().split("T")[0]);
      }
      tempDate.setDate(tempDate.getDate() + 1);
    }

    // Средняя зарплата на сотрудника (приблизительно)
    const estimatedSalaryPerEmployee = 8000000; // 8 млн UZS
    const totalSalaryExpense = employeesCount * estimatedSalaryPerEmployee / 2; // делим на 2, т.к. 2 зарплаты в месяц

    // Запланированные закупки по датам
    const purchasesByDate: Record<string, number> = {};
    for (const purchase of scheduledPurchases) {
      if (purchase.expectedDeliveryDate) {
        const dateKey = new Date(purchase.expectedDeliveryDate).toISOString().split("T")[0];
        purchasesByDate[dateKey] = (purchasesByDate[dateKey] || 0) + Number(purchase.totalAmount);
      }
    }

    // Генерируем прогноз
    const forecast: CashFlowForecast["forecast"] = [];
    let runningBalance = startBalance;
    const dayNames = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

    const forecastDate = new Date(today);
    for (let i = 0; i < forecastDays; i++) {
      const dateStr = forecastDate.toISOString().split("T")[0];
      const dayOfWeek = forecastDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Базовые прогнозы на основе истории
      let expectedIncome = isWeekend ? 0 : avgByDay[dayOfWeek].avgIncome;
      let expectedExpense = isWeekend ? 0 : avgByDay[dayOfWeek].avgExpense;

      // Добавляем зарплату
      if (salaryDates.has(dateStr)) {
        expectedExpense += totalSalaryExpense;
      }

      // Добавляем закупки
      if (purchasesByDate[dateStr]) {
        expectedExpense += purchasesByDate[dateStr];
      }

      // Первые дни месяца часто имеют повышенные платежи от родителей
      const dayOfMonth = forecastDate.getDate();
      if (dayOfMonth >= 1 && dayOfMonth <= 10 && !isWeekend) {
        expectedIncome *= 1.5; // +50% в начале месяца
      }

      const netFlow = expectedIncome - expectedExpense;
      runningBalance += netFlow;
      const isGap = runningBalance < 0;

      forecast.push({
        date: dateStr,
        dayOfWeek,
        dayName: dayNames[dayOfWeek],
        expectedIncome: Math.round(expectedIncome),
        expectedExpense: Math.round(expectedExpense),
        netFlow: Math.round(netFlow),
        runningBalance: Math.round(runningBalance),
        isGap,
        gapAmount: isGap ? Math.abs(Math.round(runningBalance)) : undefined,
      });

      forecastDate.setDate(forecastDate.getDate() + 1);
    }

    // Формируем сводку
    const totalExpectedIncome = forecast.reduce((sum, d) => sum + d.expectedIncome, 0);
    const totalExpectedExpense = forecast.reduce((sum, d) => sum + d.expectedExpense, 0);
    const daysWithGaps = forecast.filter((d) => d.isGap).length;
    const maxGapAmount = Math.max(...forecast.map((d) => d.gapAmount || 0), 0);
    const minBalance = Math.min(...forecast.map((d) => d.runningBalance));

    // Рекомендации
    const recommendations: string[] = [];
    if (daysWithGaps > 0) {
      recommendations.push(`⚠️ Обнаружено ${daysWithGaps} дней с кассовым разрывом`);
      recommendations.push(`💰 Необходимо дополнительно ${maxGapAmount.toLocaleString()} UZS`);
    }
    if (minBalance < startBalance * 0.2) {
      recommendations.push("📉 Баланс падает ниже 20% от начального");
    }
    
    // Проверяем зарплатные даты
    const gapOnSalaryDays = forecast.filter((d) => salaryDates.has(d.date) && d.isGap);
    if (gapOnSalaryDays.length > 0) {
      recommendations.push("🚨 Риск невыплаты зарплаты в срок!");
    }

    if (recommendations.length === 0) {
      recommendations.push("✅ Кассовых разрывов не прогнозируется");
    }

    const result: CashFlowForecast = {
      currentBalance: startBalance,
      forecast,
      summary: {
        totalExpectedIncome,
        totalExpectedExpense,
        netCashFlow: totalExpectedIncome - totalExpectedExpense,
        daysWithGaps,
        maxGapAmount,
        minBalance,
        recommendations,
      },
    };

    return res.json(result);
  }
);

export default router;
