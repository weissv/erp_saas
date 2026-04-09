import { useMemo} from 'react';
import { useForm} from 'react-hook-form';
import { z} from 'zod';
import { zodResolver} from '@hookform/resolvers/zod';
import { toast} from 'sonner';
import { api} from '../../lib/api';
import { useAuth} from '../../hooks/useAuth';
import { useLocation} from 'react-router-dom';
import { Loader2 } from 'lucide-react';
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
 <label htmlFor='bug-title' className='mb-1 block text-xs font-medium uppercase tracking-widest text-text-primary'>Краткий заголовок</label>
 <Input id='bug-title' {...register('title')} placeholder='Например: не открывается карточка ребёнка после сохранения' error={!!errors.title} aria-describedby={errors.title ? 'bug-title-error' : undefined} />
 <FormError message={errors.title?.message} id='bug-title-error' />
 </div>

 <div className='grid gap-4 md:grid-cols-[220px_1fr]'>
 <div>
 <label htmlFor='bug-severity' className='mb-1 block text-xs font-medium uppercase tracking-widest text-text-primary'>Критичность</label>
 <select
 id='bug-severity'
 {...register('severity')}
 className='w-full rounded-md border border-field px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
 aria-describedby={errors.severity ? 'bug-severity-error' : undefined}
 >
 {severityOptions.map((option) => (
 <option key={option.value} value={option.value}>
 {option.label}
 </option>
 ))}
 </select>
 <FormError message={errors.severity?.message} id='bug-severity-error' />
 </div>
 <div>
 <label htmlFor='bug-pageUrl' className='mb-1 block text-xs font-medium uppercase tracking-widest text-text-primary'>Страница / маршрут</label>
 <Input id='bug-pageUrl' {...register('pageUrl')} placeholder='/children/123' aria-describedby={errors.pageUrl ? 'bug-pageUrl-error' : undefined} />
 <FormError message={errors.pageUrl?.message} id='bug-pageUrl-error' />
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
 <label htmlFor='bug-actualBehavior' className='mb-1 block text-xs font-medium uppercase tracking-widest text-text-primary'>Что произошло</label>
 <textarea
 id='bug-actualBehavior'
 {...register('actualBehavior')}
 placeholder='Опишите фактическое поведение системы, сообщение об ошибке, что именно сломалось.'
 className='min-h-32 w-full rounded-md border border-field px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
 aria-describedby={errors.actualBehavior ? 'bug-actualBehavior-error' : undefined}
 />
 <FormError message={errors.actualBehavior?.message} id='bug-actualBehavior-error' />
 </div>

 <div>
 <label htmlFor='bug-expectedBehavior' className='mb-1 block text-xs font-medium uppercase tracking-widest text-text-primary'>Как должно было быть</label>
 <textarea
 id='bug-expectedBehavior'
 {...register('expectedBehavior')}
 placeholder='Опишите ожидаемый результат.'
 className='min-h-24 w-full rounded-md border border-field px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
 aria-describedby={errors.expectedBehavior ? 'bug-expectedBehavior-error' : undefined}
 />
 <FormError message={errors.expectedBehavior?.message} id='bug-expectedBehavior-error' />
 </div>

 <div>
 <label htmlFor='bug-stepsToReproduce' className='mb-1 block text-xs font-medium uppercase tracking-widest text-text-primary'>Шаги для воспроизведения</label>
 <textarea
 id='bug-stepsToReproduce'
 {...register('stepsToReproduce')}
 placeholder='1. Открыть модуль...&#10;2. Нажать...&#10;3. Получить ошибку...'
 className='min-h-28 w-full rounded-md border border-field px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
 aria-describedby={errors.stepsToReproduce ? 'bug-stepsToReproduce-error' : undefined}
 />
 <FormError message={errors.stepsToReproduce?.message} id='bug-stepsToReproduce-error' />
 </div>

 <div className='flex justify-end'>
 <Button type='submit' disabled={isSubmitting}>
 {isSubmitting && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
 {isSubmitting ? 'Отправка...' : 'Отправить разработчику'}
 </Button>
 </div>
 </form>
 );
}