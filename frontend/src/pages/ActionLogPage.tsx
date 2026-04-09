import { useEffect, useState} from 'react';
import { toast} from 'sonner';
import { api} from '../lib/api';
import { Card} from '../components/Card';
import { FileText, User, Clock} from 'lucide-react';

type Log = { 
 id: number; 
 action: string; 
 details: any; 
 timestamp: string; 
 user: { email: string} 
};

export default function ActionLogPage() {
 const [logs, setLogs] = useState<Log[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 api.get('/api/actionlog')
 .then(setLogs)
 .catch(err => toast.error('Ошибка загрузки журнала', { description: err?.message}))
 .finally(() => setLoading(false));
}, []);

 if (loading) return (
 <div className="flex items-center justify-center h-64">
 <div className="text-secondary">Загрузка журнала действий...</div>
 </div>
 );

 return (
 <div className="space-y-6">
 <div className="flex items-center gap-3">
 <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[rgba(10,132,255,0.12)] text-macos-blue shadow-[0_10px_24px_rgba(10,132,255,0.12)]">
 <FileText className="h-5 w-5"/>
 </div>
 <div>
 <div className="mezon-badge mb-2">Audit · действия</div>
 <h1 className="mezon-section-title mb-1">Журнал действий</h1>
 <p className="mezon-subtitle">Действия пользователей, системные события и детали аудита в единой ленте изменений.</p>
 </div>
 </div>
 
 <Card>
 <div className="divide-y divide-[rgba(60,60,67,0.12)]">
 {logs.length === 0 ? (
 <div className="p-8 text-center text-secondary">
 Нет записей в журнале
 </div>
 ) : (
 logs.map((log) => (
 <div key={log.id} className="p-4 macos-transition hover:bg-[rgba(255,255,255,0.5)]">
 <div className="flex items-start gap-4">
 <div className="flex-shrink-0 mt-1">
 <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(10,132,255,0.12)]">
 <User className="h-5 w-5 text-macos-blue"/>
 </div>
 </div>
 
 <div className="flex-1 min-w-0">
 <div className="flex items-center justify-between mb-1">
 <p className="font-semibold text-primary">{log.action}</p>
 <div className="flex items-center text-sm text-secondary">
 <Clock className="h-4 w-4 mr-1"/>
 {new Date(log.timestamp).toLocaleString('ru-RU')}
 </div>
 </div>
 
 <p className="mb-2 text-sm text-secondary">
 Пользователь: <span className="font-medium">{log.user.email}</span>
 </p>
 
 {log.details && Object.keys(log.details).length > 0 && (
 <details className="mt-2">
 <summary className="cursor-pointer text-sm text-macos-blue hover:text-primary">
 Подробности
 </summary>
 <div className="mt-2 rounded-md bg-[rgba(255,255,255,0.58)] p-3">
 <pre className="text-xs overflow-x-auto">
 {JSON.stringify(log.details, null, 2)}
 </pre>
 </div>
 </details>
 )}
 </div>
 </div>
 </div>
 ))
 )}
 </div>
 </Card>
 
 <div className="text-center text-sm text-secondary">
 Показаны последние {logs.length} записей
 </div>
 </div>
 );
}
