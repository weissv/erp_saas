import React from"react";
import { Card} from"../../../components/Card";
import { useOneCDebtors} from"../../../features/onec";
import type { DebtorsResponse, DebtorItem} from"../../../types/finance";
import { Users, AlertTriangle, TrendingUp} from"lucide-react";

const currency = new Intl.NumberFormat("uz-UZ", {
 style:"currency",
 currency:"UZS",
 maximumFractionDigits: 0,
});

export default function DebtorsView() {
 const { items, loading, snapshotDate} = useOneCDebtors(50);

 if (loading) {
 return (
 <div className="flex items-center justify-center h-64 text-tertiary">
 Загрузка дебиторов...
 </div>
 );
}

 if (items.length === 0) {
 return (
 <Card className="p-12 text-center">
 <Users className="mx-auto h-10 w-10 text-tertiary mb-3"/>
 <p className="text-secondary text-lg">Нет данных о дебиторской задолженности</p>
 <p className="text-tertiary text-sm mt-1">Информация появится после синхронизации с 1С</p>
 </Card>
 );
}

 const totalDebt = items.reduce((sum, debtor) => sum + Number(debtor.amount), 0);
 const maxDebt = Math.max(...items.map((debtor) => Math.abs(Number(debtor.amount))));

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <Card className="p-4 flex items-center gap-3">
 <div className="p-2 rounded-lg bg-[rgba(255,59,48,0.06)]">
 <AlertTriangle className="h-5 w-5 text-macos-red"/>
 </div>
 <div>
 <p className="text-xs text-secondary">Общая задолженность</p>
 <p className="text-[24px] font-bold tracking-[-0.025em] leading-tight text-macos-red">{currency.format(totalDebt)}</p>
 </div>
 </Card>

 <Card className="p-4 flex items-center gap-3">
 <div className="p-2 rounded-lg bg-fill-tertiary">
 <Users className="h-5 w-5 text-secondary"/>
 </div>
 <div>
 <p className="text-xs text-secondary">Дебиторов</p>
 <p className="text-[24px] font-bold tracking-[-0.025em] leading-tight text-gray-800">{items.length}</p>
 </div>
 </Card>

 <Card className="p-4 flex items-center gap-3">
 <div className="p-2 rounded-lg bg-amber-50">
 <TrendingUp className="h-5 w-5 text-amber-600"/>
 </div>
 <div>
 <p className="text-xs text-secondary">Макс. долг</p>
 <p className="text-[24px] font-bold tracking-[-0.025em] leading-tight text-amber-700">{currency.format(maxDebt)}</p>
 </div>
 </Card>
 </div>

 {snapshotDate && (
 <p className="text-xs text-tertiary">
 Данные на: {new Date(snapshotDate).toLocaleDateString("ru-RU", { day:"numeric", month:"long", year:"numeric"})}
 </p>
 )}

 {/* Debtor Cards */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {items
 .sort((a, b) => Math.abs(Number(b.amount)) - Math.abs(Number(a.amount)))
 .map((item, idx) => (
 <DebtorCard key={item.contractorId ?? idx} item={item} maxDebt={maxDebt} />
 ))}
 </div>
 </div>
 );
}

function DebtorCard({ item, maxDebt}: { item: DebtorItem; maxDebt: number}) {
 const absAmount = Math.abs(Number(item.amount));
 const pct = maxDebt > 0 ? (absAmount / maxDebt) * 100 : 0;
 const isNegative = Number(item.amount) < 0;

 return (
 <Card className="p-4 space-y-3">
 <div className="flex items-start justify-between">
 <div>
 <p className="font-medium text-gray-800">{item.contractorName}</p>
 {item.contractorInn && (
 <p className="text-xs text-tertiary mt-0.5">ИНН: {item.contractorInn}</p>
 )}
 </div>
 <span
 className={`text-lg font-bold ${
 isNegative ?"text-macos-red":"text-emerald-600"
}`}
 >
 {currency.format(Number(item.amount))}
 </span>
 </div>

 {/* Progress bar */}
 <div className="h-2 bg-fill-tertiary rounded-full overflow-hidden">
 <div
 className={`h-full rounded-full macos-transition ${
 isNegative ?"bg-red-400":"bg-emerald-400"
}`}
 style={{ width: `${pct}%`}}
 />
 </div>
 </Card>
 );
}
