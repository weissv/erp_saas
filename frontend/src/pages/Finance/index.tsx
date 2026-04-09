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
 <div className="flex items-center gap-3">
 <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[rgba(10,132,255,0.12)] text-macos-blue shadow-[0_10px_24px_rgba(10,132,255,0.12)]">
 <LayoutDashboard className="h-5 w-5"/>
 </div>
 <div>
 <div className="mezon-badge mb-2">Finance · обзор</div>
 <h1 className="mezon-section-title mb-1">Финансы</h1>
 <p className="mezon-subtitle">Ключевые показатели, транзакции, накладные и дебиторская задолженность в едином рабочем пространстве.</p>
 </div>
 </div>

 {/* Tabs */}
 <div className="inline-flex w-fit max-w-full gap-1 overflow-x-auto rounded-[16px] border border-card bg-surface-primary p-1.5 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur-[24px]">
 <nav className="flex gap-1"aria-label="Finance tabs">
 {tabs.map((tab) => (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`${
 activeTab === tab.id
 ?"bg-[rgba(255,255,255,0.9)] text-primary shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
 :"text-secondary hover:bg-[rgba(255,255,255,0.58)] hover:text-primary"
} whitespace-nowrap rounded-xl px-4 py-2 text-[11px] font-medium uppercase tracking-widest flex items-center gap-2 macos-transition`}
 >
 {tab.icon}
 {tab.label}
 </button>
 ))}
 </nav>
 </div>

 {/* Tab Content */}
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
