import React, { useState} from"react";
import { DataTable, Column} from"../../../components/DataTable/DataTable";
import { Card} from"../../../components/Card";
import { useOneCInvoices} from"../../../features/onec";
import type { Invoice} from"../../../types/finance";
import { INVOICE_DIRECTIONS} from"../../../lib/constants";
import {
 ArrowDownLeft,
 ArrowUpRight,
 CheckCircle2,
 Clock,
} from"lucide-react";

const currency = new Intl.NumberFormat("uz-UZ", {
 style:"currency",
 currency:"UZS",
 maximumFractionDigits: 0,
});

export default function InvoicesView() {
 const [direction, setDirection] = useState("");
 const { items: invoices, total, page, setPage, pageSize} = useOneCInvoices(
 direction ? { direction: direction as Invoice["direction"]} : {},
 20,
 );

 // Summary stats
 const incoming = invoices.filter((i) => i.direction ==="INCOMING");
 const outgoing = invoices.filter((i) => i.direction ==="OUTGOING");
 const incomingSum = incoming.reduce((s, i) => s + Number(i.totalAmount), 0);
 const outgoingSum = outgoing.reduce((s, i) => s + Number(i.totalAmount), 0);

 const columns: Column<Invoice>[] = [
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
 key:"documentNumber",
 header:"№ документа",
 render: (row) => (
 <span className="font-mono text-sm text-secondary">{row.documentNumber ||"—"}</span>
 ),
},
 {
 key:"direction",
 header:"Направление",
 render: (row) => (
 <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
 row.direction ==="INCOMING"
 ?"bg-tint-blue text-macos-blue"
 :"bg-orange-50 text-orange-700"
}`}>
 {row.direction ==="INCOMING"? <ArrowDownLeft className="h-3 w-3"/> : <ArrowUpRight className="h-3 w-3"/>}
 {INVOICE_DIRECTIONS[row.direction]}
 </span>
 ),
},
 {
 key:"totalAmount",
 header:"Сумма",
 render: (row) => (
 <span className="font-semibold text-gray-800">
 {currency.format(Number(row.totalAmount))}
 </span>
 ),
},
 {
 key:"contractor",
 header:"Контрагент",
 render: (row) => (
 <span className="text-primary truncate max-w-[200px] block">
 {row.contractor?.name ||"—"}
 </span>
 ),
},
 {
 key:"posted",
 header:"Статус",
 render: (row) => (
 <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
 row.posted
 ?"bg-emerald-50 text-emerald-700"
 :"bg-[rgba(255,204,0,0.06)] text-macos-orange"
}`}>
 {row.posted ? <CheckCircle2 className="h-3 w-3"/> : <Clock className="h-3 w-3"/>}
 {row.posted ?"Проведён":"Черновик"}
 </span>
 ),
},
 {
 key:"operationType",
 header:"Тип операции",
 render: (row) => (
 <span className="text-secondary text-sm">{row.operationType ||"—"}</span>
 ),
},
 {
 key:"comment",
 header:"Комментарий",
 render: (row) => (
 <span className="text-tertiary text-sm truncate max-w-[180px] block"title={row.comment ||""}>
 {row.comment ||"—"}
 </span>
 ),
},
 ];

 return (
 <div className="space-y-4">
 {/* Summary Cards */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <Card className="p-4 flex items-center gap-3">
 <div className="p-2 rounded-lg bg-tint-blue">
 <ArrowDownLeft className="h-5 w-5 text-macos-blue"/>
 </div>
 <div>
 <p className="text-xs text-secondary">Поступления</p>
 <p className="text-lg font-bold text-macos-blue">{currency.format(incomingSum)}</p>
 <p className="text-xs text-tertiary">{incoming.length} документов</p>
 </div>
 </Card>

 <Card className="p-4 flex items-center gap-3">
 <div className="p-2 rounded-lg bg-orange-50">
 <ArrowUpRight className="h-5 w-5 text-orange-600"/>
 </div>
 <div>
 <p className="text-xs text-secondary">Реализация</p>
 <p className="text-lg font-bold text-orange-700">{currency.format(outgoingSum)}</p>
 <p className="text-xs text-tertiary">{outgoing.length} документов</p>
 </div>
 </Card>

 <Card className="p-4 flex items-center gap-3">
 <div className="p-2 rounded-lg bg-fill-tertiary">
 <CheckCircle2 className="h-5 w-5 text-secondary"/>
 </div>
 <div>
 <p className="text-xs text-secondary">Всего накладных</p>
 <p className="text-lg font-bold text-gray-800">{total}</p>
 <p className="text-xs text-tertiary">
 проведено: {invoices.filter((i) => i.posted).length}
 </p>
 </div>
 </Card>
 </div>

 {/* Filter */}
 <div className="flex gap-2 items-center">
 <select
 className="border rounded-lg px-3 py-2 text-sm bg-white"
 value={direction}
 onChange={(e) => setDirection(e.target.value)}
 >
 <option value="">Все направления</option>
 <option value="INCOMING">Поступления</option>
 <option value="OUTGOING">Реализация</option>
 </select>
 </div>

 {/* Table */}
 <DataTable
 columns={columns}
 data={invoices}
 page={page}
 pageSize={pageSize}
 total={total}
 onPageChange={setPage}
 />
 </div>
 );
}
