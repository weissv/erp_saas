import { useMemo} from 'react';
import { useForm} from 'react-hook-form';
import { z} from 'zod';
import { zodResolver} from '@hookform/resolvers/zod';
import { toast} from 'sonner';
import { api} from '../../lib/api';
import { useAuth} from '../../hooks/useAuth';
import { useLocation} from 'react-router-dom';
import { Button} from '../ui/button';
import { Input} from '../ui/input';
import { FormError} from '../ui/FormError';
import type { BugSeverity, CreateBugReportPayload} from '../../types/feedback';

const formSchema = z.object({
 title: z.string().min(5, 'Кратко опишите проблему'),
 severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
 pageUrl: z.string().optional(),
 expectedBehavior: z.string().optional(),
 actualBehavior: z.string().min(10, 'Опишите, что произошло'),
 stepsToReproduce: z.string().optional(),
});

type BugReportFormData = z.infer<typeof formSchema>;

type BugReportFormProps = {
 onSuccess?: () => void;
};

const severityOptions: Array<{ value: BugSeverity; label: string; hint: string}> = [
 { value: 'LOW', label: 'Низкая', hint: 'Есть обходной путь, работа не блокируется'},
 { value: 'MEDIUM', label: 'Средняя', hint: 'Мешает работе, но не блокирует весь процесс'},
 { value: 'HIGH', label: 'Высокая', hint: 'Ключевой сценарий работает нестабильно'},
 { value: 'CRITICAL', label: 'Критическая', hint: 'Блокирует работу или приводит к потере данных'},
];

export function BugReportForm({ onSuccess}: BugReportFormProps) {
 const { user} = useAuth();
 const location = useLocation();

 const currentPath = useMemo(() => {
 const path = `${location.pathname}${location.search}${location.hash}`.trim();
 return path || '/feedback';
}, [location.hash, location.pathname, location.search]);

 const reporterName = user?.employee
 ? `${user.employee.firstName} ${user.employee.lastName}`
 : user?.email || 'Текущий пользователь';

 const {
 register,
 handleSubmit,
 reset,
 formState: { errors, isSubmitting},
} = useForm<BugReportFormData>({
 resolver: zodResolver(formSchema),
 defaultValues: {
 title: '',
 severity: 'MEDIUM',
 pageUrl: currentPath,
 expectedBehavior: '',
 actualBehavior: '',
 stepsToReproduce: '',
},
});

 const onSubmit = async (data: BugReportFormData) => {
 try {
 const payload: CreateBugReportPayload = {
 title: data.title.trim(),
 severity: data.severity,
 pageUrl: data.pageUrl?.trim() || currentPath,
 expectedBehavior: data.expectedBehavior?.trim() || undefined,
 actualBehavior: data.actualBehavior.trim(),
 stepsToReproduce: data.stepsToReproduce?.trim() || undefined,
 browserInfo: navigator.userAgent,
};

 await api.post('/api/feedback/bug-report', payload);

 toast.success('Баг-репорт отправлен разработчику в Telegram');
 reset({
 title: '',
 severity: 'MEDIUM',
 pageUrl: currentPath,
 expectedBehavior: '',
 actualBehavior: '',
 stepsToReproduce: '',
});
 onSuccess?.();
} catch (error: any) {
 toast.error('Не удалось отправить баг-репорт', { description: error?.message});
}
};

 return (
 <form onSubmit={handleSubmit(onSubmit)} className='space-y-5'>
 <div className='grid gap-4 md:grid-cols-2'>
 <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
 <p className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Отправитель</p>
 <p className='mt-1 text-[11px] font-medium uppercase tracking-widest text-slate-900'>{reporterName}</p>
 <p className='text-sm text-slate-600'>{user?.email}</p>
 </div>
 <div className='rounded-xl border border-emerald-200 bg-emerald-50 p-4'>
 <p className='text-xs font-semibold uppercase tracking-wide text-emerald-700'>Маршрут доставки</p>
 <p className='mt-1 text-[11px] font-medium uppercase tracking-widest text-emerald-900'>Telegram-бот разработчика</p>
 <p className='text-sm text-emerald-700'>Репорт сразу уходит в тот же бот, который уже рассылает служебные заявки.</p>
 </div>
 </div>

 <div>
 <label className='mb-1 block text-[11px] font-medium uppercase tracking-widest'>Краткий заголовок</label>
 <Input {...register('title')} placeholder='Например: не открывается карточка ребёнка после сохранения' />
 <FormError message={errors.title?.message} />
 </div>

 <div className='grid gap-4 md:grid-cols-[220px_1fr]'>
 <div>
 <label className='mb-1 block text-[11px] font-medium uppercase tracking-widest'>Критичность</label>
 <select
 {...register('severity')}
 className='w-full rounded-md border border-field px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
 >
 {severityOptions.map((option) => (
 <option key={option.value} value={option.value}>
 {option.label}
 </option>
 ))}
 </select>
 <FormError message={errors.severity?.message} />
 </div>
 <div>
 <label className='mb-1 block text-[11px] font-medium uppercase tracking-widest'>Страница / маршрут</label>
 <Input {...register('pageUrl')} placeholder='/children/123' />
 <FormError message={errors.pageUrl?.message} />
 </div>
 </div>

 <div className='rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900'>
 {severityOptions.map((option) => (
 <div key={option.value} className='flex items-start justify-between gap-3 py-1'>
 <span className='font-medium'>{option.label}</span>
 <span className='text-right text-amber-800'>{option.hint}</span>
 </div>
 ))}
 </div>

 <div>
 <label className='mb-1 block text-[11px] font-medium uppercase tracking-widest'>Что произошло</label>
 <textarea
 {...register('actualBehavior')}
 placeholder='Опишите фактическое поведение системы, сообщение об ошибке, что именно сломалось.'
 className='min-h-32 w-full rounded-md border border-field px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
 />
 <FormError message={errors.actualBehavior?.message} />
 </div>

 <div>
 <label className='mb-1 block text-[11px] font-medium uppercase tracking-widest'>Как должно было быть</label>
 <textarea
 {...register('expectedBehavior')}
 placeholder='Опишите ожидаемый результат.'
 className='min-h-24 w-full rounded-md border border-field px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
 />
 <FormError message={errors.expectedBehavior?.message} />
 </div>

 <div>
 <label className='mb-1 block text-[11px] font-medium uppercase tracking-widest'>Шаги для воспроизведения</label>
 <textarea
 {...register('stepsToReproduce')}
 placeholder='1. Открыть модуль...&#10;2. Нажать...&#10;3. Получить ошибку...'
 className='min-h-28 w-full rounded-md border border-field px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
 />
 <FormError message={errors.stepsToReproduce?.message} />
 </div>

 <div className='flex justify-end'>
 <Button type='submit' disabled={isSubmitting}>
 {isSubmitting ? 'Отправка...' : 'Отправить разработчику'}
 </Button>
 </div>
 </form>
 );
}