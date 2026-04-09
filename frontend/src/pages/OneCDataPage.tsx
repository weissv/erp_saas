import React, { useMemo, useState} from"react";
import {
 BookOpen,
 Building2,
 Database,
 FileText,
 RefreshCw,
 Users,
 Wallet,
} from"lucide-react";
import { toast} from"sonner";
import {
 CatalogsTab,
 DocumentsTab,
 ExtraCatalogsTab,
 HRTab,
 OneCSummaryCards,
 PayrollTab,
 useOneCSummary,
 useOneCSync,
} from"../features/onec";

type TabId ="catalogs"|"documents"|"hr"|"payroll"|"extra-catalogs";

const tabs: { id: TabId; label: string; icon: React.ReactNode}[] = [
 { id:"catalogs", label:"Справочники", icon: <Building2 className="h-4 w-4"/>},
 { id:"extra-catalogs", label:"Доп. справочники", icon: <BookOpen className="h-4 w-4"/>},
 { id:"documents", label:"Документы", icon: <FileText className="h-4 w-4"/>},
 { id:"hr", label:"Кадры", icon: <Users className="h-4 w-4"/>},
 { id:"payroll", label:"Зарплата", icon: <Wallet className="h-4 w-4"/>},
];

export default function OneCDataPage() {
 const [activeTab, setActiveTab] = useState<TabId>("catalogs");
 const { data: summary, loading: summaryLoading, refresh: refreshSummary} = useOneCSummary();
 const { syncing, sync} = useOneCSync();

 const totalRecords = useMemo(() => {
 if (!summary) return 0;

 return Object.values(summary.catalogs).reduce((sum, value) => sum + value, 0) +
 summary.universalCatalogs.total +
 summary.documents.total +
 summary.hrDocuments.total +
 summary.payrollDocuments.total +
 summary.registers.total;
}, [summary]);

 const handleSync = async () => {
 if (syncing) return;

 try {
 const report = await sync();
 if (!report) {
 toast.error("Синхронизация не вернула результат. Попробуйте повторить позже.");
 return;
}
 await refreshSummary();

 const totalUpserted = report.results.reduce((sum, item) => sum + item.upserted, 0);
 const totalErrors = report.results.reduce((sum, item) => sum + item.errors, 0);

 if (report.aborted) {
 toast.error("Синхронизация прервана", { description: report.error});
 return;
}

 if (totalErrors > 0) {
 toast.warning(`Синхронизация завершена с ошибками. Загружено: ${totalUpserted}, ошибок: ${totalErrors}`);
 return;
}

 toast.success(`Синхронизация завершена. Загружено ${totalUpserted} записей.`);
} catch (error: unknown) {
 const errorMessage = error instanceof Error ? error.message : String(error);
 toast.error("Ошибка синхронизации с 1С", { description: errorMessage});
}
};

 return (
 <div className="space-y-6">
 <div className="flex items-center justify-between flex-wrap gap-4">
 <div>
 <h1 className="text-3xl font-bold flex items-center gap-3">
 <Database className="h-8 w-8 text-macos-blue"/>
 Данные 1С
 </h1>
 <p className="text-sm text-secondary mt-1">
 {summaryLoading ?"Загрузка...": `${totalRecords.toLocaleString("ru-RU")} записей синхронизировано`}
 </p>
 </div>
 <button
 onClick={handleSync}
 disabled={syncing}
 className="inline-flex items-center gap-2 px-4 py-2 bg-macos-blue text-white text-[11px] font-medium uppercase tracking-widest rounded-lg hover:bg-blue-700 disabled:opacity-50 macos-transition"
 >
 <RefreshCw className={`h-4 w-4 ${syncing ?"animate-spin":""}`} />
 {syncing ?"Синхронизация...":"Синхронизировать"}
 </button>
 </div>

 {summaryLoading && !summary && (
 <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
 {Array.from({ length: 6}).map((_, i) => (
 <div key={i} className="rounded-lg border bg-white p-4 animate-pulse">
 <div className="h-3 w-16 rounded bg-fill-secondary"/>
 <div className="mt-2 h-7 w-12 rounded bg-fill-secondary"/>
 <div className="mt-1 h-3 w-20 rounded bg-fill-secondary"/>
 </div>
 ))}
 </div>
 )}
 {summary && <OneCSummaryCards summary={summary} />}

 <div className="border-b border-[rgba(0,0,0,0.08)]">
 <nav className="-mb-px flex space-x-6 overflow-x-auto"aria-label="1C Data tabs">
 {tabs.map((tab) => (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`${
 activeTab === tab.id
 ?"border-blue-500 text-macos-blue"
 :"border-transparent text-secondary hover:text-primary hover:border-field"
} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 macos-transition`}
 >
 {tab.icon}
 {tab.label}
 </button>
 ))}
 </nav>
 </div>

 <div>
 {activeTab ==="catalogs"&& <CatalogsTab summary={summary} />}
 {activeTab ==="extra-catalogs"&& <ExtraCatalogsTab summary={summary} />}
 {activeTab ==="documents"&& <DocumentsTab summary={summary} />}
 {activeTab ==="hr"&& <HRTab summary={summary} />}
 {activeTab ==="payroll"&& <PayrollTab summary={summary} />}
 </div>
 </div>
 );
}
