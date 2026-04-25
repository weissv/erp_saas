import React, { useEffect, useMemo, useState} from"react";
import { toast} from"sonner";
import { DataTable, Column} from"../../../components/DataTable/DataTable";
import { Card} from"../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { Button} from"../../../components/ui/button";
import { Input, inputBaseClassName } from "../../../components/ui/input";
import { useOneCContractors, useOneCTransactions} from"../../../features/onec";
import type { FinanceTransaction} from"../../../types/finance";
import { FINANCE_TYPES, FINANCE_CATEGORIES, TRANSACTION_CHANNELS} from"../../../lib/constants";
import { api} from"../../../lib/api";
import { cn } from "../../../lib/utils";
import {
  Download,
  Search,
  Filter,
  X,
 ArrowUpRight,
 ArrowDownRight,
 Banknote,
 Building2,
} from"lucide-react";

const currency = new Intl.NumberFormat("uz-UZ", {
 style:"currency",
 currency:"UZS",
 maximumFractionDigits: 0,
});

type Filters = {
 channel: string;
 type: string;
 category: string;
 search: string;
 startDate: string;
 endDate: string;
 contractorId: string;
};

const defaultFilters: Filters = {
 channel:"",
 type:"",
 category:"",
 search:"",
 startDate:"",
 endDate:"",
 contractorId:"",
};

export default function TransactionsView() {
 const [filters, setFilters] = useState<Filters>(defaultFilters);
 const [showFilters, setShowFilters] = useState(false);
 const { data: contractors} = useOneCContractors();
 const transactionFilters = useMemo(
 () => ({
 channel: filters.channel as""|"CASH"|"BANK",
 type: filters.type as""|"INCOME"|"EXPENSE",
 category: filters.category as""|"NUTRITION"|"CLUBS"|"MAINTENANCE"|"SALARY"|"OTHER",
 search: filters.search,
 startDate: filters.startDate,
 endDate: filters.endDate,
 contractorId: filters.contractorId,
}),
 [filters],
 );
  const { items: transactions, total, page, setPage, setFilters: setTransactionFilters} = useOneCTransactions({}, 20);

  useEffect(() => {
    setTransactionFilters(transactionFilters);
  }, [transactionFilters, setTransactionFilters]);

 const activeFilterCount = Object.values(filters).filter(Boolean).length;

 const updateFilter = (key: keyof Filters, value: string) => {
 setFilters((prev) => ({ ...prev, [key]: value}));
};

 const clearFilters = () => setFilters(defaultFilters);

 const handleExport = async () => {
 try {
 const blob = await api.download("/api/finance/export");
 const url = window.URL.createObjectURL(blob);
 const a = document.createElement("a");
 a.href = url;
 a.download = `finance_export_${new Date().toISOString().split("T")[0]}.csv`;
 a.click();
 window.URL.revokeObjectURL(url);
 toast.success("Экспорт завершен");
} catch (error: any) {
 toast.error("Ошибка экспорта", { description: error?.message});
}
};

 const columns: Column<FinanceTransaction>[] = [
 {
 key:"date",
 header:"Дата",
 render: (row) => (
 <span className="text-primary font-medium">
 {new Date(row.date).toLocaleDateString("ru-RU", { day:"2-digit", month:"short", year:"2-digit"})}
 </span>
 ),
},
 {
 key:"channel",
 header:"Канал",
 render: (row) => {
 if (!row.channel) return <span className="text-tertiary">—</span>;
 return (
 <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
 row.channel ==="CASH"
 ?"bg-emerald-50 text-emerald-700"
 :"bg-tint-blue text-macos-blue"
}`}>
 {row.channel ==="CASH"? <Banknote className="h-3 w-3"/> : <Building2 className="h-3 w-3"/>}
 {TRANSACTION_CHANNELS[row.channel]}
 </span>
 );
},
},
 {
 key:"type",
 header:"Тип",
 render: (row) => (
 <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
 row.type ==="INCOME"
 ?"bg-emerald-50 text-emerald-700"
 :"bg-[rgba(255,59,48,0.06)] text-macos-red"
}`}>
 {row.type ==="INCOME"? <ArrowUpRight className="h-3 w-3"/> : <ArrowDownRight className="h-3 w-3"/>}
 {FINANCE_TYPES[row.type]}
 </span>
 ),
},
 {
 key:"amount",
 header:"Сумма",
 render: (row) => (
 <span className={`font-semibold ${Number(row.amount) >= 0 ?"text-emerald-600":"text-macos-red"}`}>
 {currency.format(Number(row.amount))}
 </span>
 ),
},
 {
 key:"category",
 header:"Категория",
 render: (row) => (
 <span className="text-xs bg-fill-tertiary text-primary px-2 py-1 rounded">
 {FINANCE_CATEGORIES[row.category] || row.category}
 </span>
 ),
},
 {
 key:"contractor",
 header:"Контрагент",
 render: (row) => (
 <span className="text-primary truncate max-w-[160px] block">
 {row.contractor?.name || row.person?.name ||"—"}
 </span>
 ),
},
 {
 key:"cashFlowArticle",
 header:"Статья ДДС",
 render: (row) => (
 <span className="text-secondary truncate max-w-[140px] block text-sm">
 {row.cashFlowArticle?.name ||"—"}
 </span>
 ),
},
 {
 key:"documentNumber",
 header:"№ док.",
 render: (row) => (
 <span className="text-secondary font-mono text-xs">{row.documentNumber ||"—"}</span>
 ),
},
 {
 key:"description",
 header:"Описание",
 render: (row) => {
 const text = row.description || row.purpose ||"";
 return (
 <span className="text-secondary text-sm truncate max-w-[200px] block"title={text}>
 {text ||"—"}
 </span>
 );
},
},
 ];

  return (
    <div className="space-y-4">
      <Card className="border-border/70">
        <div className="flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <Badge variant="neutral">Transactions</Badge>
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-foreground">Транзакции</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  Высокоплотная таблица операций с быстрыми фильтрами по каналу, типу, контрагенту и периоду.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowFilters((value) => !value)} className="relative">
                <Filter className="h-4 w-4" />
                Фильтры
                {activeFilterCount > 0 ? (
                  <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    {activeFilterCount}
                  </span>
                ) : null}
              </Button>
              {activeFilterCount > 0 ? (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4" />
                  Сбросить
                </Button>
              ) : null}
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4" />
                CSV
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[180px_180px_minmax(0,1fr)]">
            <select
              className={cn(inputBaseClassName, "appearance-none")}
              value={filters.channel}
              onChange={(e) => updateFilter("channel", e.target.value)}
            >
              <option value="">Все каналы</option>
              <option value="CASH">Касса</option>
              <option value="BANK">Банк</option>
            </select>

            <select
              className={cn(inputBaseClassName, "appearance-none")}
              value={filters.type}
              onChange={(e) => updateFilter("type", e.target.value)}
            >
              <option value="">Все типы</option>
              <option value="INCOME">Доход</option>
              <option value="EXPENSE">Расход</option>
            </select>

            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/>
              <Input
                placeholder="Поиск по описанию, контрагенту или номеру документа"
                className="pl-9"
                value={filters.search}
                onChange={(e) => updateFilter("search", e.target.value)}
              />
            </div>
          </div>
        </div>
      </Card>

      {showFilters && (
        <Card className="border-border/70">
          <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <label className="block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Категория</label>
              <select
                className={cn(inputBaseClassName, "appearance-none")}
                value={filters.category}
                onChange={(e) => updateFilter("category", e.target.value)}
              >
                <option value="">Все</option>
                {Object.entries(FINANCE_CATEGORIES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Контрагент</label>
              <select
                className={cn(inputBaseClassName, "appearance-none")}
                value={filters.contractorId}
                onChange={(e) => updateFilter("contractorId", e.target.value)}
              >
                <option value="">Все</option>
                {(contractors ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Дата от</label>
              <Input type="date" value={filters.startDate} onChange={(e) => updateFilter("startDate", e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Дата до</label>
              <Input type="date" value={filters.endDate} onChange={(e) => updateFilter("endDate", e.target.value)} />
            </div>
          </div>
        </Card>
      )}

      <DataTable
        title="Журнал операций"
        description="Список синхронизированных финансовых операций с экспортом и постраничной навигацией."
        columns={columns}
        data={transactions}
        page={page}
        pageSize={20}
        total={total}
        onPageChange={setPage}
        emptyTitle="Транзакции не найдены"
        emptyDescription="Измените фильтры или загрузите операции из 1C."
      />
    </div>
  );
}
