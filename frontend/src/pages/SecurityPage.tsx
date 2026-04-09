// src/pages/SecurityPage.tsx
import { useState, useEffect} from 'react';
import { useForm} from 'react-hook-form';
import { zodResolver} from '@hookform/resolvers/zod';
import { z} from 'zod';
import { toast} from 'sonner';
import { api} from '../lib/api';
import { Card} from '../components/Card';
import { Modal} from '../components/Modal';
import { Button} from '../components/ui/button';
import { Input} from '../components/ui/input';
import { FormError} from '../components/ui/FormError';
import { DataTable} from '../components/DataTable/DataTable';
import { Trash2, AlertCircle, Edit, Plus, Filter, Shield} from 'lucide-react';

const selectClassName = 'mezon-field';
const textareaClassName = 'mezon-field min-h-[112px] resize-y';

const eventTypeLabels: Record<string, string> = {
 INCIDENT: 'Происшествие',
 FIRE_CHECK: 'Проверка ПБ',
 VISITOR_LOG: 'Учёт посетителей',
 DOCUMENT: 'Документ по охране',
};

const eventTypeColors: Record<string, string> = {
 INCIDENT: 'bg-[rgba(255,59,48,0.12)] text-[var(--macos-red)]',
 FIRE_CHECK: 'bg-[rgba(255,149,0,0.14)] text-[var(--macos-orange)]',
 VISITOR_LOG: 'bg-[rgba(10,132,255,0.12)] text-macos-blue',
 DOCUMENT: 'bg-[rgba(52,199,89,0.14)] text-[var(--macos-green)]',
};

// Схема на основе createSecurityLogSchema
const securityLogFormSchema = z.object({
 eventType: z.enum(['INCIDENT', 'FIRE_CHECK', 'VISITOR_LOG', 'DOCUMENT']),
 description: z.string().optional(),
 date: z.string(),
 documentUrl: z.string().optional(),
});

type SecurityLogFormData = z.infer<typeof securityLogFormSchema>;
type SecurityLog = { id: number; eventType: string; description?: string; date: string; documentUrl?: string};

export default function SecurityPage() {
 const [logs, setLogs] = useState<SecurityLog[]>([]);
 const [loading, setLoading] = useState(true);
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [editingLog, setEditingLog] = useState<SecurityLog | null>(null);
 const [deleteConfirm, setDeleteConfirm] = useState<SecurityLog | null>(null);
 const [isDeleting, setIsDeleting] = useState(false);
 const [filterType, setFilterType] = useState<string>('');

 const {
 register,
 handleSubmit,
 reset,
 formState: { errors, isSubmitting},
} = useForm<SecurityLogFormData>({
 resolver: zodResolver(securityLogFormSchema),
 defaultValues: {
 eventType: 'INCIDENT',
 date: new Date().toISOString().slice(0, 16),
},
});

 const fetchLogs = async () => {
 setLoading(true);
 try {
 const response = await api.get('/api/security');
 setLogs(response || []);
} catch (error) {
 console.error('Failed to fetch security logs:', error);
} finally {
 setLoading(false);
}
};

 useEffect(() => {
 fetchLogs();
}, []);

 const handleCreate = () => {
 setEditingLog(null);
 reset({
 eventType: 'INCIDENT',
 date: new Date().toISOString().slice(0, 16),
 description: '',
 documentUrl: '',
});
 setIsModalOpen(true);
};

 const handleEdit = (log: SecurityLog) => {
 setEditingLog(log);
 reset({
 eventType: log.eventType as any,
 date: new Date(log.date).toISOString().slice(0, 16),
 description: log.description || '',
 documentUrl: log.documentUrl || '',
});
 setIsModalOpen(true);
};

 const onSubmit = async (data: SecurityLogFormData) => {
 try {
 const payload = {
 eventType: data.eventType,
 description: data.description?.trim() || undefined,
 date: new Date(data.date).toISOString(),
 documentUrl: data.documentUrl?.trim() || null,
};

 if (editingLog) {
 await api.put(`/api/security/${editingLog.id}`, payload);
 toast.success('Запись обновлена');
} else {
 await api.post('/api/security', payload);
 toast.success('Запись добавлена');
}
 setIsModalOpen(false);
 setEditingLog(null);
 fetchLogs();
} catch (error: any) {
 toast.error('Ошибка сохранения', { description: error?.message});
}
};

 const handleDelete = async () => {
 if (!deleteConfirm) return;
 setIsDeleting(true);
 try {
 await api.delete(`/api/security/${deleteConfirm.id}`);
 toast.success('Запись удалена');
 setDeleteConfirm(null);
 fetchLogs();
} catch (error: any) {
 toast.error('Ошибка удаления', { description: error?.message});
} finally {
 setIsDeleting(false);
}
};

 // Фильтрация логов
 const filteredLogs = filterType 
 ? logs.filter(log => log.eventType === filterType)
 : logs;

 // Статистика по типам
 const stats = logs.reduce((acc, log) => {
 acc[log.eventType] = (acc[log.eventType] || 0) + 1;
 return acc;
}, {} as Record<string, number>);

 const columns = [
 {
 key: 'eventType',
 header: 'Тип',
 render: (row: SecurityLog) => (
 <span className={`px-2 py-1 rounded text-sm ${eventTypeColors[row.eventType] || ''}`}>
 {eventTypeLabels[row.eventType] || row.eventType}
 </span>
 ),
},
 {
 key: 'description',
 header: 'Описание',
 render: (row: SecurityLog) => (
 <span className="line-clamp-2">{row.description || '—'}</span>
 ),
},
 {
 key: 'date',
 header: 'Дата',
 render: (row: SecurityLog) => new Date(row.date).toLocaleString('ru-RU'),
},
 {
 key: 'documentUrl',
 header: 'Документ',
 render: (row: SecurityLog) => row.documentUrl ? (
 <a href={row.documentUrl} target="_blank"rel="noopener noreferrer"className="text-blue-500 hover:underline">
 Ссылка
 </a>
 ) : '—',
},
 {
 key: 'actions',
 header: 'Действия',
 render: (row: SecurityLog) => (
 <div className="flex gap-2">
 <Button variant="outline"size="sm"onClick={() => handleEdit(row)}>
 <Edit className="h-4 w-4"/>
 </Button>
 <Button variant="destructive"size="sm"onClick={() => setDeleteConfirm(row)}>
 <Trash2 className="h-4 w-4"/>
 </Button>
 </div>
 ),
},
 ];

 return (
 <div className="space-y-6">
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
 <div className="flex items-center gap-3">
 <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[rgba(10,132,255,0.12)] text-macos-blue shadow-[0_10px_24px_rgba(10,132,255,0.12)]">
 <Shield className="h-5 w-5"/>
 </div>
 <div>
 <div className="mezon-badge mb-2">Safety · журнал</div>
 <h1 className="mezon-section-title mb-1">Журнал безопасности</h1>
 <p className="mezon-subtitle">Происшествия, проверки, посетители и документы по охране в одном реестре.</p>
 </div>
 </div>
 <Button onClick={handleCreate}>
 <Plus className="mr-2 h-4 w-4"/> Добавить запись
 </Button>
 </div>

 {/* Статистика */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 {Object.entries(eventTypeLabels).map(([key, label]) => (
 <Card
 key={key} 
 className={`p-0 macos-transition ${filterType === key ? 'ring-2 ring-macos-blue' : 'hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]'}`}
 >
 <button
 type="button"
 className="flex w-full items-center gap-3 p-4 text-left"
 onClick={() => setFilterType(filterType === key ? '' : key)}
 >
 <div className={`p-2 rounded-full ${eventTypeColors[key]}`}>
 <Shield className="h-4 w-4"/>
 </div>
 <div>
 <p className="text-sm text-secondary">{label}</p>
 <p className="text-[24px] font-bold tracking-[-0.025em] leading-tight text-primary">{stats[key] || 0}</p>
 </div>
 </button>
 </Card>
 ))}
 </div>

 {/* Фильтр */}
 {filterType && (
 <div className="flex items-center gap-2 rounded-lg bg-[rgba(10,132,255,0.08)] px-3 py-2 text-sm text-macos-blue">
 <Filter className="h-4 w-4"/>
 <span>Фильтр: {eventTypeLabels[filterType]}</span>
 <button onClick={() => setFilterType('')} className="ml-2 underline hover:no-underline">
 Сбросить
 </button>
 </div>
 )}

 <Card>
 {loading ? (
 <div className="p-8 text-center">
 <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-macos-blue"></div>
 <p className="mt-2 text-secondary">Загрузка...</p>
 </div>
 ) : filteredLogs.length === 0 ? (
 <div className="p-8 text-center text-secondary">
 {filterType ? 'Нет записей выбранного типа' : 'Журнал пуст. Добавьте первую запись.'}
 </div>
 ) : (
 <DataTable 
 columns={columns} 
 data={filteredLogs} 
 page={1} 
 pageSize={filteredLogs.length} 
 total={filteredLogs.length} 
 onPageChange={() => {}} 
 />
 )}
 </Card>

 {/* Create/Edit Modal */}
 <Modal 
 isOpen={isModalOpen} 
 onClose={() => { setIsModalOpen(false); setEditingLog(null);}} 
 title={editingLog ? 'Редактировать запись' : 'Новая запись'}
 >
 <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
 <div>
 <label htmlFor="date"className="mb-1 block font-medium text-primary">Дата и время *</label>
 <Input type="datetime-local"{...register('date')} id="date"/>
 {errors.date && <FormError message={errors.date.message} />}
 </div>

 <div>
 <label htmlFor="eventType"className="mb-1 block font-medium text-primary">Тип события *</label>
 <select {...register('eventType')} id="eventType"className={selectClassName}>
 <option value="INCIDENT">Происшествие</option>
 <option value="FIRE_CHECK">Проверка пожарной безопасности</option>
 <option value="VISITOR_LOG">Учёт посетителей</option>
 <option value="DOCUMENT">Документ по охране труда</option>
 </select>
 {errors.eventType && <FormError message={errors.eventType.message} />}
 </div>

 <div>
 <label htmlFor="description"className="mb-1 block font-medium text-primary">Описание</label>
 <textarea 
 {...register('description')} 
 id="description"
 className={textareaClassName} 
 rows={4}
 placeholder="Подробное описание события..."
 />
 </div>

 <div>
 <label htmlFor="documentUrl"className="mb-1 block font-medium text-primary">Ссылка на документ</label>
 <Input 
 {...register('documentUrl')} 
 id="documentUrl"
 placeholder="https://drive.google.com/..."
 />
 {errors.documentUrl && <FormError message={errors.documentUrl.message} />}
 </div>

 <div className="flex justify-end gap-2 pt-4">
 <Button 
 type="button"
 variant="ghost"
 onClick={() => { setIsModalOpen(false); setEditingLog(null);}}
 >
 Отмена
 </Button>
 <Button type="submit"disabled={isSubmitting}>
 {isSubmitting ? 'Сохранение...' : editingLog ? 'Сохранить' : 'Добавить'}
 </Button>
 </div>
 </form>
 </Modal>

 {/* Delete Confirmation Modal */}
 <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Удаление записи">
 <div className="p-4">
 <div className="flex items-start gap-3 mb-4">
 <div className="rounded-[8px] bg-[rgba(255,59,48,0.12)] p-2">
 <AlertCircle className="h-6 w-6 text-[var(--macos-red)]"/>
 </div>
 <div>
 <p className="font-medium text-primary">Вы уверены, что хотите удалить эту запись?</p>
 {deleteConfirm && (
 <div className="mt-2 rounded-lg bg-[rgba(255,255,255,0.58)] p-3 text-sm">
 <p><strong>Тип:</strong> {eventTypeLabels[deleteConfirm.eventType]}</p>
 <p><strong>Дата:</strong> {new Date(deleteConfirm.date).toLocaleString('ru-RU')}</p>
 {deleteConfirm.description && <p><strong>Описание:</strong> {deleteConfirm.description}</p>}
 </div>
 )}
 <p className="mt-2 text-sm text-[var(--macos-red)]">Это действие нельзя отменить!</p>
 </div>
 </div>
 <div className="flex justify-end gap-2">
 <Button variant="ghost"onClick={() => setDeleteConfirm(null)} disabled={isDeleting}>Отмена</Button>
 <Button variant="destructive"onClick={handleDelete} disabled={isDeleting}>
 {isDeleting ? 'Удаление...' : 'Удалить'}
 </Button>
 </div>
 </div>
 </Modal>
 </div>
 );
}
