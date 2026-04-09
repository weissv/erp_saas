import React, { useState, useEffect} from"react";
import { toast} from"sonner";
import { Card} from"../../../components/Card";
import { useOneCBalances} from"../../../features/onec";
import { api} from"../../../lib/api";
import { FINANCE_CATEGORIES, TRANSACTION_CHANNELS} from"../../../lib/constants";
import type { BalancesResponse} from"../../../types/finance";
import {
 Wallet,
 Landmark,
 DollarSign,
 TrendingUp,
 TrendingDown,
 Calculator,
 AlertTriangle,
 BarChart3,
 ArrowUpRight,
 ArrowDownRight,
} from"lucide-react";
import {
 BarChart,
 Bar,
 XAxis,
 YAxis,
 CartesianGrid,
 Tooltip,
 ResponsiveContainer,
 PieChart,
 Pie,
 Cell,
 Legend,
} from"recharts";

const currency = new Intl.NumberFormat("uz-UZ", {
 style:"currency",
 currency:"UZS",
 maximumFractionDigits: 0,
});

const shortCurrency = (v: number) => {
 if (Math.abs(v) >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} млрд`;
 if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} млн`;
 if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)} тыс`;
 return String(v);
};

const PIE_THEME_COLORS = [
"var(--mezon-accent)",
"var(--macos-green)",
"var(--macos-orange)",
"var(--macos-red)",
"var(--macos-purple)",
"var(--macos-teal)",
];

// ── Balance Cards ──
function BalanceCards({ data}: { data: BalancesResponse | null}) {
 if (!data || data.balances.length === 0) return null;

 const cash = data.balances.find((b) => b.type ==="CASH");
 const bank = data.balances.find((b) => b.type ==="BANK");
 const total = (cash?.amount ?? 0) + (bank?.amount ?? 0);

 const cards = [
 { label:"Касса", amount: cash?.amount ?? 0, icon: Wallet, color:"text-[var(--macos-green)]", bg:"bg-[rgba(52,199,89,0.14)]"},
 { label:"Расчётный счёт", amount: bank?.amount ?? 0, icon: Landmark, color:"text-macos-blue", bg:"bg-[rgba(10,132,255,0.12)]"},
 { label:"Итого", amount: total, icon: DollarSign, color:"text-[var(--macos-purple)]", bg:"bg-[rgba(191,90,242,0.14)]"},
 ];

 return (
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 {cards.map((c) => (
 <Card key={c.label} className="p-0 overflow-hidden">
 <div className="flex items-center p-5 gap-4">
 <div className={`${c.bg} p-3 rounded-xl`}>
 <c.icon className={`h-6 w-6 ${c.color}`} />
 </div>
 <div className="min-w-0">
 <p className="truncate text-sm text-secondary">{c.label}</p>
 <p className="truncate text-[24px] font-bold tracking-[-0.025em] leading-tight text-primary">{currency.format(c.amount)}</p>
 </div>
 </div>
 </Card>
 ))}
 {data.snapshotDate && (
 <p className="col-span-full text-xs text-[var(--mezon-text-soft)]">
 Данные на {new Date(data.snapshotDate).toLocaleDateString("ru-RU")}
 </p>
 )}
 </div>
 );
}

// ── Summary Cards (Income / Expense / Profit) ──
function SummarySection({ summary}: { summary: any}) {
 if (!summary) return null;

 const income = Number(summary.byType?.find((t: any) => t.type ==="INCOME")?._sum?.amount || 0);
 const expense = Math.abs(Number(summary.byType?.find((t: any) => t.type ==="EXPENSE")?._sum?.amount || 0));
 const profit = income - expense;
 const totalTransactions = Number(summary.totals?.totalTransactions ?? 0);
 const totalInvoices = Number(summary.totals?.totalInvoices ?? 0);
 const totalDocuments = Number(summary.totals?.totalDocuments ?? totalTransactions);

 const kpis = [
 {
 label:"Доходы",
 value: income,
 icon: ArrowUpRight,
 color:"text-[var(--macos-green)]",
 bg:"bg-[rgba(52,199,89,0.14)]",
},
 {
 label:"Расходы",
 value: expense,
 icon: ArrowDownRight,
 color:"text-[var(--macos-red)]",
 bg:"bg-[rgba(255,59,48,0.12)]",
},
 {
 label:"Прибыль",
 value: profit,
 icon: profit >= 0 ? TrendingUp : TrendingDown,
 color: profit >= 0 ?"text-[var(--macos-green)]":"text-[var(--macos-red)]",
 bg: profit >= 0 ?"bg-[rgba(52,199,89,0.14)]":"bg-[rgba(255,59,48,0.12)]",
},
 {
 label:"Всего документов",
 value: totalDocuments,
 icon: BarChart3,
 color:"text-macos-blue",
 bg:"bg-[rgba(10,132,255,0.12)]",
 isCurrency: false,
 hint: `Операции: ${totalTransactions} • Накладные: ${totalInvoices}`,
},
 ];

 return (
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
 {kpis.map((k) => (
 <Card key={k.label} className="p-0 overflow-hidden">
 <div className="p-5">
 <div className="flex items-center justify-between mb-2">
 <span className="text-sm text-secondary">{k.label}</span>
 <div className={`${k.bg} p-2 rounded-lg`}>
 <k.icon className={`h-4 w-4 ${k.color}`} />
 </div>
 </div>
 <p className={`text-[24px] font-bold tracking-[-0.025em] leading-tight ${k.color}`}>
 {k.isCurrency === false ? k.value : currency.format(k.value)}
 </p>
 {k.hint && <p className="mt-1 text-xs text-[var(--mezon-text-soft)]">{k.hint}</p>}
 </div>
 </Card>
 ))}
 </div>
 );
}

// ── Category Breakdown (Bar Chart) ──
function CategoryChart({ summary}: { summary: any}) {
 if (!summary?.byCategory?.length) return null;

 const data = summary.byCategory.map((cat: any) => ({
 name: FINANCE_CATEGORIES[cat.category as keyof typeof FINANCE_CATEGORIES] || cat.category,
 amount: Math.abs(Number(cat._sum?.amount || 0)),
 count: cat._count?.id || 0,
}));

 return (
 <Card className="p-6">
 <h3 className="mb-4 text-[14px] font-semibold tracking-[-0.01em] text-primary">Распределение по категориям</h3>
 <div className="h-64">
 <ResponsiveContainer width="100%"height="100%">
 <BarChart data={data} layout="vertical"margin={{ left: 10, right: 20}}>
 <CartesianGrid strokeDasharray="3 3"stroke="rgba(60,60,67,0.12)"/>
 <XAxis type="number"tickFormatter={(v) => shortCurrency(v)} fontSize={12} stroke="var(--mezon-text-soft)"/>
 <YAxis type="category"dataKey="name"width={100} fontSize={12} stroke="var(--mezon-text-soft)"/>
 <Tooltip
 formatter={(val: number) => currency.format(val)}
 labelStyle={{ fontWeight: 600}}
 />
 <Bar dataKey="amount"fill="var(--mezon-accent)"radius={[0, 4, 4, 0]} barSize={28} name="Сумма"/>
 </BarChart>
 </ResponsiveContainer>
 </div>
 </Card>
 );
}

// ── Channel Distribution (Pie Chart) ──
function ChannelChart({ summary}: { summary: any}) {
 if (!summary?.byChannel?.length) return null;

 const data = summary.byChannel
 .filter((ch: any) => ch.channel)
 .map((ch: any) => ({
 name: TRANSACTION_CHANNELS[ch.channel as keyof typeof TRANSACTION_CHANNELS] || ch.channel,
 value: Math.abs(Number(ch._sum?.amount || 0)),
}));

 if (data.length === 0) return null;

 return (
 <Card className="p-6">
 <h3 className="mb-4 text-[14px] font-semibold tracking-[-0.01em] text-primary">По каналам (касса / банк)</h3>
 <div className="h-64">
 <ResponsiveContainer width="100%"height="100%">
 <PieChart>
 <Pie
 data={data}
 cx="50%"
 cy="50%"
 innerRadius={50}
 outerRadius={90}
 paddingAngle={4}
 dataKey="value"
 label={({ name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
 labelLine={false}
 >
 {data.map((_: any, idx: number) => (
 <Cell key={idx} fill={PIE_THEME_COLORS[idx % PIE_THEME_COLORS.length]} />
 ))}
 </Pie>
 <Tooltip formatter={(val: number) => currency.format(val)} />
 <Legend />
 </PieChart>
 </ResponsiveContainer>
 </div>
 </Card>
 );
}

// ── Unit Economics Widget ──
function UnitEconomicsWidget() {
 const [data, setData] = useState<any>(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 api
 .get("/api/finance/unit-economics?months=3")
 .then(setData)
 .catch(() => {})
 .finally(() => setLoading(false));
}, []);

 if (loading) return <Card className="p-6 animate-pulse h-48"><div /></Card>;
 if (!data) return null;

 const costRows = [
 { label:"Питание", ...data.costs.nutrition},
 { label:"Зарплата", ...data.costs.salary},
 { label:"Хоз. нужды", ...data.costs.maintenance},
 { label:"Кружки", ...data.costs.clubs},
 { label:"Прочие", ...data.costs.other},
 { label:"Амортизация", ...data.costs.depreciation},
 ].filter((r) => r.total !== 0);

 return (
 <Card className="p-6">
 <div className="flex items-center gap-2 mb-4">
 <Calculator className="h-5 w-5 text-macos-blue"/>
 <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-primary">Unit-экономика</h3>
 <span className="ml-auto text-xs text-[var(--mezon-text-soft)]">
 {data.period.workingDays} раб. дн. · {data.children.total} детей
 </span>
 </div>

 {/* Summary row */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
 <div className="rounded-lg bg-[rgba(10,132,255,0.12)] p-3 text-center">
 <p className="text-xs text-macos-blue">Расход/мес на ребёнка</p>
 <p className="text-lg font-bold text-primary">{currency.format(data.totals.costPerChildMonthly)}</p>
 </div>
 <div className="rounded-lg bg-[rgba(52,199,89,0.14)] p-3 text-center">
 <p className="text-xs text-[var(--macos-green)]">Доход на ребёнка</p>
 <p className="text-lg font-bold text-primary">{currency.format(data.income.perChild)}</p>
 </div>
 <div className={`${data.income.margin >= 0 ?"bg-[rgba(52,199,89,0.14)]":"bg-[rgba(255,59,48,0.12)]"} rounded-lg p-3 text-center`}>
 <p className={`text-xs ${data.income.margin >= 0 ?"text-[var(--macos-green)]":"text-[var(--macos-red)]"}`}>Маржа</p>
 <p className="text-lg font-bold text-primary">
 {currency.format(data.income.margin)}
 </p>
 </div>
 <div className={`${data.income.marginPercent >= 0 ?"bg-[rgba(52,199,89,0.14)]":"bg-[rgba(255,59,48,0.12)]"} rounded-lg p-3 text-center`}>
 <p className={`text-xs ${data.income.marginPercent >= 0 ?"text-[var(--macos-green)]":"text-[var(--macos-red)]"}`}>Маржа %</p>
 <p className="text-lg font-bold text-primary">
 {data.income.marginPercent}%
 </p>
 </div>
 </div>

 {/* Cost breakdown */}
 {costRows.length > 0 && (
 <div className="space-y-2">
 {costRows.map((row) => {
 const pct = data.totals.totalCost ? Math.round((Math.abs(row.total) / Math.abs(data.totals.totalCost)) * 100) : 0;
 return (
 <div key={row.label} className="flex items-center gap-3 text-sm">
 <span className="w-24 truncate text-secondary">{row.label}</span>
 <div className="h-3 flex-1 overflow-hidden rounded-full bg-[rgba(60,60,67,0.08)]">
 <div
 className="h-full rounded-full bg-macos-blue macos-transition"
 style={{ width: `${Math.min(pct, 100)}%`}}
 />
 </div>
 <span className="w-28 text-right font-medium text-primary">{currency.format(Math.abs(row.total))}</span>
 <span className="w-10 text-right text-[var(--mezon-text-soft)]">{pct}%</span>
 </div>
 );
})}
 </div>
 )}
 </Card>
 );
}

// ── Cash Forecast Widget ──
function CashForecastWidget({ currentBalance}: { currentBalance: number}) {
 const [data, setData] = useState<any>(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 api
 .get(`/api/finance/cash-forecast?days=30&currentBalance=${currentBalance}`)
 .then(setData)
 .catch(() => {})
 .finally(() => setLoading(false));
}, [currentBalance]);

 if (loading) return <Card className="p-6 animate-pulse h-48"><div /></Card>;
 if (!data) return null;

 const hasGaps = data.summary.daysWithGaps > 0;

 return (
 <Card className={`p-6 ${hasGaps ?"border-l-4 border-l-[var(--macos-orange)]":""}`}>
 <div className="flex items-center gap-2 mb-4">
 {hasGaps ? (
 <AlertTriangle className="h-5 w-5 text-[var(--macos-orange)]"/>
 ) : (
 <TrendingUp className="h-5 w-5 text-[var(--macos-green)]"/>
 )}
 <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-primary">Прогноз на 30 дней</h3>
 </div>

 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
 <div className="rounded-lg bg-[rgba(255,255,255,0.5)] p-3 text-center">
 <p className="text-xs text-secondary">Ожидаемый доход</p>
 <p className="text-base font-bold text-[var(--macos-green)]">{currency.format(data.summary.totalExpectedIncome)}</p>
 </div>
 <div className="rounded-lg bg-[rgba(255,255,255,0.5)] p-3 text-center">
 <p className="text-xs text-secondary">Ожидаемый расход</p>
 <p className="text-base font-bold text-[var(--macos-red)]">{currency.format(data.summary.totalExpectedExpense)}</p>
 </div>
 <div className="rounded-lg bg-[rgba(255,255,255,0.5)] p-3 text-center">
 <p className="text-xs text-secondary">Мин. баланс</p>
 <p className={`text-base font-bold ${data.summary.minBalance >= 0 ?"text-primary":"text-[var(--macos-red)]"}`}>
 {currency.format(data.summary.minBalance)}
 </p>
 </div>
 <div className="rounded-lg bg-[rgba(255,255,255,0.5)] p-3 text-center">
 <p className="text-xs text-secondary">Дней с дефицитом</p>
 <p className={`text-base font-bold ${hasGaps ?"text-[var(--macos-orange)]":"text-[var(--macos-green)]"}`}>
 {data.summary.daysWithGaps}
 </p>
 </div>
 </div>

 {/* Recommendations */}
 {data.summary.recommendations?.length > 0 && (
 <div className="space-y-1">
 {data.summary.recommendations.map((rec: string, idx: number) => (
 <p key={idx} className="flex items-start gap-2 text-sm text-secondary">
 <span className="mt-0.5 text-[var(--macos-orange)]">•</span>
 {rec}
 </p>
 ))}
 </div>
 )}
 </Card>
 );
}

// ── Main Dashboard View ──
export default function DashboardView() {
 const [summary, setSummary] = useState<any>(null);
 const [loading, setLoading] = useState(true);
 const { data: balanceData, loading: balanceLoading} = useOneCBalances();

 useEffect(() => {
 api
 .get("/api/finance/reports/summary")
 .then((response) => {
 setSummary(response);
})
 .catch((err: any) => toast.error("Ошибка загрузки", { description: err?.message}))
 .finally(() => setLoading(false));
}, []);

 if (loading || balanceLoading) {
 return (
 <div className="space-y-4">
 {[...Array(3)].map((_, i) => (
 <div key={i} className="h-32 animate-pulse rounded-[20px] bg-[rgba(255,255,255,0.58)]"/>
 ))}
 </div>
 );
}

 const totalBalance =
 (balanceData?.balances?.find((b) => b.type ==="CASH")?.amount ?? 0) +
 (balanceData?.balances?.find((b) => b.type ==="BANK")?.amount ?? 0);

 return (
 <div className="space-y-6">
 {/* Balance Cards */}
 <BalanceCards data={balanceData} />

 {/* KPI Summary */}
 <SummarySection summary={summary} />

 {/* Charts row */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <CategoryChart summary={summary} />
 <ChannelChart summary={summary} />
 </div>

 {/* Analytics row */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <UnitEconomicsWidget />
 <CashForecastWidget currentBalance={totalBalance} />
 </div>
 </div>
 );
}
