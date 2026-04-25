import React, { useState} from"react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  FileText,
  Users,
  BarChart3,
} from"lucide-react";
import DashboardView from"./views/DashboardView";
import TransactionsView from"./views/TransactionsView";
import InvoicesView from"./views/InvoicesView";
import DebtorsView from"./views/DebtorsView";
import FinanceRegistersView from"./views/FinanceRegistersView";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { cn } from "../../lib/utils";

type TabId ="dashboard"|"transactions"|"invoices"|"debtors"|"registers";

const tabs: { id: TabId; label: string; icon: React.ReactNode}[] = [
 { id:"dashboard", label:"Обзор", icon: <LayoutDashboard className="h-4 w-4"/>},
 { id:"transactions", label:"Транзакции", icon: <ArrowLeftRight className="h-4 w-4"/>},
 { id:"invoices", label:"Накладные", icon: <FileText className="h-4 w-4"/>},
 { id:"debtors", label:"Дебиторы", icon: <Users className="h-4 w-4"/>},
  { id:"registers", label:"НДС и активы", icon: <BarChart3 className="h-4 w-4"/>},
];

export default function FinancePage() {
 const [activeTab, setActiveTab] = useState<TabId>("dashboard");

  return (
    <div className="space-y-6">
      <Card className="border-border/70 bg-card/90">
        <div className="flex flex-col gap-4 p-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Badge variant="default">Finance workspace</Badge>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <LayoutDashboard className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">Финансы</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Единый контур для контроля денежных потоков, накладных, дебиторки и регистров с высокой плотностью данных.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-background px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Контур</p>
              <p className="mt-2 text-sm font-medium text-foreground">ERP + 1C</p>
            </div>
            <div className="rounded-xl border border-border bg-background px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Режим</p>
              <p className="mt-2 text-sm font-medium text-foreground">Data-dense</p>
            </div>
            <div className="rounded-xl border border-border bg-background px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Навигация</p>
              <p className="mt-2 text-sm font-medium text-foreground">{tabs.find((tab) => tab.id === activeTab)?.label}</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="overflow-x-auto">
        <nav className="inline-flex min-w-full gap-2 rounded-xl border border-border bg-card p-2 shadow-sm sm:min-w-0" aria-label="Finance tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition-colors",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div>
        {activeTab ==="dashboard"&& <DashboardView />}
        {activeTab ==="transactions"&& <TransactionsView />}
        {activeTab ==="invoices"&& <InvoicesView />}
        {activeTab ==="debtors"&& <DebtorsView />}
        {activeTab ==="registers"&& <FinanceRegistersView />}
      </div>
    </div>
  );
}
