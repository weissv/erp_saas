import { OneCIntegrationPanel} from"../features/onec/components/OneCIntegrationPanel";
import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState, useCallback} from"react";
import { Download, UploadCloud, Link2, RefreshCw, CheckCircle2, Clock, AlertCircle} from"lucide-react";
import { toast} from"sonner";
import { Card} from"../components/Card";
import { Button} from"../components/ui/button";
import { useOneCSync} from"../features/onec";
import { api} from"../lib/api";
import { useLocation} from"react-router-dom";
import clsx from"clsx";

const ENTITIES = [
 { key:"children", label:"Дети", description:"Полная база воспитанников и статусов"},
 { key:"employees", label:"Сотрудники", description:"Кадровые карточки, даты договоров и медосмотров"},
 { key:"inventory", label:"Склад", description:"Учёт остатков, сроков годности и номенклатуры"},
 { key:"finance", label:"Финансовые транзакции", description:"Доходы/расходы с привязкой к кружкам"},
] as const;

type IntegrationEntity = (typeof ENTITIES)[number]["key"];

type LoadingMap = Record<IntegrationEntity, boolean>;

export default function IntegrationPage() {
 const initialState = useMemo(() => ENTITIES.reduce((acc, item) => ({ ...acc, [item.key]:""}), {} as Record<IntegrationEntity, string>), []);
 const initialLoading = useMemo(() => ENTITIES.reduce((acc, item) => ({ ...acc, [item.key]: false}), {} as LoadingMap), []);
 const initialBooleans = useMemo(
 () => ENTITIES.reduce((acc, item) => ({ ...acc, [item.key]: false}), {} as Record<IntegrationEntity, boolean>),
 []
 );
 const [sheetUrls, setSheetUrls] = useState<Record<IntegrationEntity, string>>(initialState);
 const [exporting, setExporting] = useState<LoadingMap>(initialLoading);
 const [importing, setImporting] = useState<LoadingMap>(initialLoading);
 const [sheetImporting, setSheetImporting] = useState<LoadingMap>(initialLoading);
 const [dragActive, setDragActive] = useState<Record<IntegrationEntity, boolean>>(initialBooleans);
 const [highlightedEntity, setHighlightedEntity] = useState<IntegrationEntity | null>(null);
 const location = useLocation();
 const fileInputs = useRef<Record<IntegrationEntity, HTMLInputElement | null>>({
 children: null,
 employees: null,
 inventory: null,
 finance: null,
});

 useEffect(() => {
 if (!location.hash) {
 return;
}
 const rawKey = decodeURIComponent(location.hash.replace('#', '')) as IntegrationEntity;
 const exists = ENTITIES.some((entity) => entity.key === rawKey);
 if (!exists) {
 return;
}
 setHighlightedEntity(rawKey);
 const section = document.getElementById(`integration-${rawKey}`);
 if (section) {
 section.scrollIntoView({ behavior: 'smooth', block: 'start'});
}
 const timer = window.setTimeout(() => {
 setHighlightedEntity((prev) => (prev === rawKey ? null : prev));
}, 1800);
 return () => window.clearTimeout(timer);
}, [location.hash]);

 const handleExport = async (entity: IntegrationEntity) => {
 setExporting((prev) => ({ ...prev, [entity]: true}));
 try {
 const blob = await api.download(`/api/integration/export/excel/${entity}`);
 const url = URL.createObjectURL(blob);
 const anchor = document.createElement("a");
 anchor.href = url;
 anchor.download = `${entity}-export-${new Date().toISOString().split("T")[0]}.xlsx`;
 anchor.click();
 URL.revokeObjectURL(url);
 toast.success("Файл сформирован");
} catch (error: any) {
 toast.error("Экспорт не удался", { description: error?.message});
} finally {
 setExporting((prev) => ({ ...prev, [entity]: false}));
}
};

 const convertFileToBase64 = (file: File) => {
 return new Promise<string>((resolve, reject) => {
 const reader = new FileReader();
 reader.onload = () => {
 const result = reader.result;
 if (typeof result ==="string") {
 resolve(result.split(",").pop() ||"");
} else {
 reject(new Error("Невозможно прочитать файл"));
}
};
 reader.onerror = () => reject(new Error("Ошибка чтения файла"));
 reader.readAsDataURL(file);
});
};

 const handleExcelImport = async (entity: IntegrationEntity, file: File | null | undefined) => {
 if (!file) return;
 setImporting((prev) => ({ ...prev, [entity]: true}));
 try {
 const fileBase64 = await convertFileToBase64(file);
 await api.post(`/api/integration/import/excel/${entity}`, { fileBase64});
 toast.success("Данные загружены");
} catch (error: any) {
 toast.error("Импорт не удался", { description: error?.message});
} finally {
 setImporting((prev) => ({ ...prev, [entity]: false}));
}
};

 const handleSheetImport = async (entity: IntegrationEntity) => {
 const url = sheetUrls[entity]?.trim();
 if (!url) {
 toast.error("Укажите ссылку на Google Sheets");
 return;
}
 setSheetImporting((prev) => ({ ...prev, [entity]: true}));
 try {
 await api.post("/api/integration/import/google-sheets", { entity, sheetUrl: url});
 toast.success("Импорт из Google Sheets завершён");
} catch (error: any) {
 toast.error("Импорт Google Sheets не удался", { description: error?.message});
} finally {
 setSheetImporting((prev) => ({ ...prev, [entity]: false}));
}
};

 const handleFileInputChange = (entity: IntegrationEntity, event: ChangeEvent<HTMLInputElement>) => {
 const file = event.target.files?.[0];
 event.target.value ="";
 handleExcelImport(entity, file);
};

 const handleManualUpload = (entity: IntegrationEntity) => {
 fileInputs.current[entity]?.click();
};

 const handleDrag = (entity: IntegrationEntity, event: DragEvent<HTMLDivElement>) => {
 event.preventDefault();
 event.stopPropagation();
 if (event.type ==="dragenter"|| event.type ==="dragover") {
 setDragActive((prev) => (prev[entity] ? prev : { ...prev, [entity]: true}));
} else if (event.type ==="dragleave") {
 const related = event.relatedTarget as Node | null;
 if (!related || !event.currentTarget.contains(related)) {
 setDragActive((prev) => ({ ...prev, [entity]: false}));
}
}
};

 const handleDrop = (entity: IntegrationEntity, event: DragEvent<HTMLDivElement>) => {
 event.preventDefault();
 event.stopPropagation();
 setDragActive((prev) => ({ ...prev, [entity]: false}));
 const file = event.dataTransfer?.files?.[0];
 handleExcelImport(entity, file);
};

 return (
 <div className="space-y-6">
 <div className="flex flex-col gap-2">
 <h1 className="text-3xl font-bold">Импорт / Экспорт данных</h1>
 <p className="text-secondary">Скачайте актуальные шаблоны, отредактируйте их в Excel или Google Sheets и загрузите обратно в систему.</p>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {ENTITIES.map((entity) => (
 <div
 key={entity.key}
 id={`integration-${entity.key}`}
 className={clsx(
"rounded-lg transition-shadow",
 highlightedEntity === entity.key &&"ring-2 ring-blue-400 shadow-lg"
 )}
 >
 <Card className="space-y-4">
 <div>
 <h2 className="text-xl font-semibold">{entity.label}</h2>
 <p className="text-sm text-secondary">{entity.description}</p>
 </div>

 <div className="flex flex-wrap gap-3">
 <Button
 type="button"
 onClick={() => handleExport(entity.key)}
 disabled={exporting[entity.key]}
 className="flex-1 min-w-[160px]"
 >
 <Download className="h-4 w-4 mr-2"/>
 {exporting[entity.key] ?"Создаём файл...":"Скачать шаблон"}
 </Button>
 <Button
 type="button"
 variant="secondary"
 onClick={() => handleManualUpload(entity.key)}
 disabled={importing[entity.key]}
 className="flex-1 min-w-[160px]"
 >
 <UploadCloud className="h-4 w-4 mr-2"/>
 {importing[entity.key] ?"Загружаем...":"Загрузить"}
 </Button>
 <input
 type="file"
 accept=".xlsx,.xls"
 className="hidden"
 ref={(el) => {
 fileInputs.current[entity.key] = el;
}}
 onChange={(event) => handleFileInputChange(entity.key, event)}
 />
 </div>

 <div
 className={clsx(
"border-2 border-dashed rounded-lg p-4 text-center macos-transition cursor-pointer",
 dragActive[entity.key] ?"border-blue-500 bg-tint-blue":"border-field hover:border-blue-400",
 importing[entity.key] &&"opacity-50 pointer-events-none"
 )}
 onClick={() => handleManualUpload(entity.key)}
 onDragEnter={(event) => handleDrag(entity.key, event)}
 onDragOver={(event) => handleDrag(entity.key, event)}
 onDragLeave={(event) => handleDrag(entity.key, event)}
 onDrop={(event) => handleDrop(entity.key, event)}
 >
 <div className="flex flex-col items-center gap-2">
 <UploadCloud className="h-6 w-6 text-secondary"/>
 <p className="font-medium">Перетащите XLSX-файл сюда</p>
 <p className="text-sm text-secondary">или нажмите, чтобы выбрать файл в проводнике</p>
 </div>
 </div>

 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest text-primary mb-1">Google Sheets (публичная ссылка на CSV)</label>
 <div className="flex flex-col gap-2 sm:flex-row">
 <input
 type="url"
 placeholder="https://docs.google.com/spreadsheets/..."
 className="flex-1 px-3 py-2 border border-field rounded-md"
 value={sheetUrls[entity.key]}
 onChange={(event) => setSheetUrls((prev) => ({ ...prev, [entity.key]: event.target.value}))}
 />
 <Button
 type="button"
 onClick={() => handleSheetImport(entity.key)}
 disabled={sheetImporting[entity.key]}
 className="flex-none"
 >
 <Link2 className="h-4 w-4 mr-2"/>
 {sheetImporting[entity.key] ?"Импорт...":"Забрать данные"}
 </Button>
 </div>
 </div>
 </Card>
 </div>
 ))}
 </div>

 {/* 1C: Enterprise Integration */}
 <OneCIntegrationPanel />
 </div>
 );
}

