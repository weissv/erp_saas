import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState} from 'react';
import { useForm} from 'react-hook-form';
import { z} from 'zod';
import { zodResolver} from '@hookform/resolvers/zod';
import { toast} from 'sonner';
import clsx from 'clsx';
import { Loader2, UploadCloud} from 'lucide-react';
import { api} from '../../lib/api';
import { ModalNotice, ModalSection} from '../Modal';
import { Button} from '../ui/button';
import { Input} from '../ui/input';
import { FormError} from '../ui/FormError';
import { Document} from '../../types/document';

const formSchema = z.object({
 name: z.string().min(2, 'Название обязательно'),
 fileUrl: z.string().url('Должна быть ссылка на файл'),
 templateId: z.coerce.number().optional().nullable(),
 employeeId: z.coerce.number().optional().nullable(),
 childId: z.coerce.number().optional().nullable(),
});

type DocumentFormData = z.infer<typeof formSchema>;
type DocumentFormProps = { 
 initialData?: Document | null; 
 onSuccess: () => void; 
 onCancel: () => void; 
};

interface Employee { id: number; firstName: string; lastName: string; position: string;}
interface Child { id: number; firstName: string; lastName: string;}
interface Template { id: number; name: string;}

export function DocumentForm({ initialData, onSuccess, onCancel}: DocumentFormProps) {
 const [employees, setEmployees] = useState<Employee[]>([]);
 const [children, setChildren] = useState<Child[]>([]);
 const [templates, setTemplates] = useState<Template[]>([]);
 const [isLoading, setIsLoading] = useState(false);

 const {
 register,
 handleSubmit,
 setValue,
 watch,
 formState: { errors, isSubmitting},
} = useForm<DocumentFormData>({
 resolver: zodResolver(formSchema),
 defaultValues: {
 name: initialData?.name || '',
 fileUrl: initialData?.fileUrl || '',
 templateId: initialData?.templateId || null,
 employeeId: initialData?.employeeId || null,
 childId: initialData?.childId || null,
},
});
 const fileInputRef = useRef<HTMLInputElement | null>(null);
 const [dragActive, setDragActive] = useState(false);
 const [uploading, setUploading] = useState(false);
 const fileUrlValue = watch('fileUrl');
 const uploadedFileName = useMemo(() => {
 const current = fileUrlValue;
 if (!current) return '';
 if (current.startsWith('data:')) return 'Загружен файл (base64)';
 try {
 const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
 const url = new URL(current, base);
 return decodeURIComponent(url.pathname.split('/').pop() || url.hostname);
} catch {
 return current.length > 50 ? `${current.slice(0, 47)}...`: current;
}
}, [fileUrlValue]);

 // Загрузка данных для выпадающих списков
 useEffect(() => {
 setIsLoading(true);
 Promise.all([
 api.get('/api/employees?pageSize=200').catch(() => ({ items: []})),
 api.get('/api/children?pageSize=200').catch(() => ({ items: []})),
 api.get('/api/documents/templates').catch(() => []),
 ])
 .then(([empData, childData, templatesData]) => {
 setEmployees(empData.items || empData || []);
 setChildren(childData.items || childData || []);
 setTemplates(Array.isArray(templatesData) ? templatesData : []);
})
 .finally(() => setIsLoading(false));
}, []);

 const onSubmit = async (data: DocumentFormData) => {
 try {
 // Преобразуем пустые строки в null
 const payload = {
 ...data,
 templateId: data.templateId || null,
 employeeId: data.employeeId || null,
 childId: data.childId || null,
};
 if (initialData) {
 await api.put(`/api/documents/${initialData.id}`, payload);
} else {
 await api.post('/api/documents', payload);
}
 onSuccess();
} catch (error: any) {
 const msg = error?.message || 'Ошибка сохранения';
 toast.error('Ошибка', { description: msg});
}
};

 const convertFileToBase64 = (file: File) => {
 return new Promise<string>((resolve, reject) => {
 const reader = new FileReader();
 reader.onload = () => {
 const result = reader.result;
 if (typeof result === 'string') {
 resolve(result);
} else {
 reject(new Error('Не удалось прочитать файл'));
}
};
 reader.onerror = () => reject(new Error('Ошибка чтения файла'));
 reader.readAsDataURL(file);
});
};

 const handleFileSelected = async (file: File | null | undefined) => {
 if (!file) return;
 setUploading(true);
 try {
 const base64 = await convertFileToBase64(file);
 setValue('fileUrl', base64, { shouldValidate: true, shouldDirty: true});
 toast.success('Файл добавлен к документу');
} catch (error: any) {
 toast.error('Загрузка не удалась', { description: error?.message});
} finally {
 setUploading(false);
}
};

 const handleFileInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
 const file = event.target.files?.[0];
 event.target.value = '';
 await handleFileSelected(file);
};

 const handleManualUpload = () => {
 fileInputRef.current?.click();
};

 const handleDrag = (event: DragEvent<HTMLDivElement>) => {
 event.preventDefault();
 event.stopPropagation();
 if (event.type === 'dragenter' || event.type === 'dragover') {
 setDragActive(true);
} else if (event.type === 'dragleave') {
 const related = event.relatedTarget as Node | null;
 if (!related || !event.currentTarget.contains(related)) {
 setDragActive(false);
}
}
};

 const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
 event.preventDefault();
 event.stopPropagation();
 setDragActive(false);
 const file = event.dataTransfer?.files?.[0];
 await handleFileSelected(file);
};

 return (
 <form onSubmit={handleSubmit(onSubmit)} className="mezon-modal-form">
 <ModalSection title="Карточка документа" description="Заполните название и файл, чтобы документ было легко найти в каталоге и открыть без лишних уточнений.">
 <div>
 <label htmlFor="doc-name" className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">Название документа</label>
 <Input id="doc-name" {...register('name')} placeholder="Договор №123" error={!!errors.name} aria-describedby={errors.name ? 'doc-name-error' : undefined}/>
 <FormError message={errors.name?.message} id="doc-name-error" />
 </div>

 <div>
 <label htmlFor="doc-fileUrl" className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">Ссылка на файл</label>
 <Input id="doc-fileUrl" {...register('fileUrl')} placeholder="/uploads/document.pdf" error={!!errors.fileUrl} aria-describedby={errors.fileUrl ? 'doc-fileUrl-error' : undefined}/>
 <FormError message={errors.fileUrl?.message} id="doc-fileUrl-error" />

 <div className="mt-3 space-y-3">
 <div
 className={clsx(
 'cursor-pointer rounded-[20px] border-2 border-dashed p-5 text-center macos-transition',
 dragActive
 ? 'border-[var(--color-blue)] bg-[rgba(0,122,255,0.06)]'
 : 'border-[rgba(15,23,42,0.12)] bg-[rgba(255,255,255,0.68)] hover:border-[rgba(0,122,255,0.42)]',
 uploading && 'pointer-events-none opacity-60'
 )}
 onClick={handleManualUpload}
 onDragEnter={handleDrag}
 onDragOver={handleDrag}
 onDragLeave={handleDrag}
 onDrop={handleDrop}
 >
 <div className="flex flex-col items-center gap-2">
 <UploadCloud className="h-6 w-6 text-secondary"/>
 <p className="font-medium text-primary">Перетащите файл или нажмите для выбора</p>
 <p className="text-sm text-secondary">Поддерживаются PDF, DOCX, изображения и другие форматы</p>
 {uploadedFileName ? (
 <p className="text-xs text-secondary">{uploading ? 'Обработка...' : uploadedFileName}</p>
 ) : null}
 </div>
 </div>

 <div className="flex justify-center">
 <Button type="button"variant="secondary"size="sm"onClick={handleManualUpload} disabled={uploading}>
 {uploading ? 'Загружаем...' : 'Загрузить файл'}
 </Button>
 </div>

 <input
 ref={fileInputRef}
 type="file"
 accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
 className="hidden"
 onChange={handleFileInputChange}
 />
 </div>
 </div>

 <ModalNotice title="Подсказка" tone="info">
 Если загружаете файл прямо из модалки, поле ссылки заполнится автоматически. Ссылку можно и вставить вручную, если файл уже хранится в системе.
 </ModalNotice>
 </ModalSection>

 <ModalSection title="Привязка документа" description="Связи помогают быстро находить документы в карточках сотрудников и учеников.">
 <div>
 <label htmlFor="doc-templateId" className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">Шаблон</label>
 <select
 id="doc-templateId"
 className="mezon-field"
 {...register('templateId', { valueAsNumber: true})}
 disabled={isLoading}
 aria-describedby={errors.templateId ? 'doc-templateId-error' : undefined}
 >
 <option value="">Без шаблона</option>
 {templates.map((t) => (
 <option key={t.id} value={t.id}>{t.name}</option>
 ))}
 </select>
 <FormError message={errors.templateId?.message} id="doc-templateId-error" />
 </div>

 <div>
 <label htmlFor="doc-employeeId" className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">Сотрудник</label>
 <select
 id="doc-employeeId"
 className="mezon-field"
 {...register('employeeId', { valueAsNumber: true})}
 disabled={isLoading}
 aria-describedby={errors.employeeId ? 'doc-employeeId-error' : undefined}
 >
 <option value="">Не привязан к сотруднику</option>
 {employees.map((e) => (
 <option key={e.id} value={e.id}>{e.lastName} {e.firstName} — {e.position}</option>
 ))}
 </select>
 <FormError message={errors.employeeId?.message} id="doc-employeeId-error" />
 </div>

 <div>
 <label htmlFor="doc-childId" className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">Ученик</label>
 <select
 id="doc-childId"
 className="mezon-field"
 {...register('childId', { valueAsNumber: true})}
 disabled={isLoading}
 aria-describedby={errors.childId ? 'doc-childId-error' : undefined}
 >
 <option value="">Не привязан к ученику</option>
 {children.map((c) => (
 <option key={c.id} value={c.id}>{c.lastName} {c.firstName}</option>
 ))}
 </select>
 <FormError message={errors.childId?.message} id="doc-childId-error" />
 </div>
 </ModalSection>

 <div className="mezon-modal-inline-actions">
 <Button type="button"variant="ghost"onClick={onCancel} disabled={isSubmitting}>Отмена</Button>
 <Button type="submit"disabled={isSubmitting}>
 {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
 {isSubmitting ? 'Сохранение...' : 'Сохранить'}
 </Button>
 </div>
 </form>
 );
}
