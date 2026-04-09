import { useForm} from 'react-hook-form';
import { z} from 'zod';
import { zodResolver} from '@hookform/resolvers/zod';
import { toast} from 'sonner';
import { useEffect, useState} from 'react';
import { api} from '../../lib/api';
import { Button} from '../ui/button';
import { Input} from '../ui/input';
import { FormError} from '../ui/FormError';
import { Event} from '../../types/calendar';
import { X} from 'lucide-react';

interface GroupOption {
 id: number;
 name: string;
}

const formSchema = z.object({
 title: z.string().min(3, 'Тема должна быть не менее 3 символов'),
 date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Неверная дата'),
 groupId: z.string().optional(),
 organizer: z.string().min(2, 'Укажите организатора'),
 performers: z.array(z.string()).default([]),
});

type EventFormData = z.infer<typeof formSchema>;
type EventFormProps = { 
 initialData?: Event | null; 
 onSuccess: () => void; 
 onCancel: () => void; 
};

export function EventForm({ initialData, onSuccess, onCancel}: EventFormProps) {
 const [groups, setGroups] = useState<GroupOption[]>([]);
 const [performerInput, setPerformerInput] = useState('');
 const [performers, setPerformers] = useState<string[]>(initialData?.performers || []);

 const { register, handleSubmit, formState: { errors, isSubmitting}, setValue} = useForm<EventFormData>({
 resolver: zodResolver(formSchema),
 defaultValues: {
 title: initialData?.title || '',
 date: initialData ? new Date(initialData.date).toISOString().slice(0, 16) : '',
 groupId: initialData?.groupId?.toString() || '',
 organizer: initialData?.organizer || '',
 performers: initialData?.performers || [],
},
});

 useEffect(() => {
 api.get('/api/calendar/groups').then(setGroups).catch(console.error);
}, []);

 useEffect(() => {
 setValue('performers', performers);
}, [performers, setValue]);

 const addPerformer = () => {
 const trimmed = performerInput.trim();
 if (trimmed && !performers.includes(trimmed)) {
 setPerformers([...performers, trimmed]);
 setPerformerInput('');
}
};

 const removePerformer = (index: number) => {
 setPerformers(performers.filter((_, i) => i !== index));
};

 const handleKeyDown = (e: React.KeyboardEvent) => {
 if (e.key === 'Enter') {
 e.preventDefault();
 addPerformer();
}
};

 const onSubmit = async (data: EventFormData) => {
 try {
 const payload = {
 title: data.title,
 date: new Date(data.date).toISOString(),
 groupId: data.groupId ? Number(data.groupId) : null,
 organizer: data.organizer,
 performers: performers,
};

 if (initialData) {
 await api.put(`/api/calendar/${initialData.id}`, payload);
} else {
 await api.post('/api/calendar', payload);
}
 onSuccess();
} catch (error: any) {
 const msg = error?.message || 'Ошибка сохранения';
 toast.error('Ошибка', { description: msg});
}
};

 return (
 <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest mb-1">Тема (название)</label>
 <Input {...register('title')} placeholder="День открытых дверей"/>
 <FormError message={errors.title?.message} />
 </div>

 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest mb-1">Дата</label>
 <Input type="datetime-local"{...register('date')} />
 <FormError message={errors.date?.message} />
 </div>

 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest mb-1">Класс</label>
 <select
 {...register('groupId')}
 className="mezon-field"
 >
 <option value="">-- Не выбран --</option>
 {groups.map((g) => (
 <option key={g.id} value={g.id}>{g.name}</option>
 ))}
 </select>
 </div>

 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest mb-1">Организатор</label>
 <Input {...register('organizer')} placeholder="Иванов И.И."/>
 <FormError message={errors.organizer?.message} />
 </div>

 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest mb-1">Исполнители</label>
 <div className="flex gap-2">
 <Input
 value={performerInput}
 onChange={(e) => setPerformerInput(e.target.value)}
 onKeyDown={handleKeyDown}
 placeholder="Введите ФИО и нажмите Enter"
 />
 <Button type="button"variant="outline"onClick={addPerformer}>Добавить</Button>
 </div>
 {performers.length > 0 && (
 <div className="mt-2 flex flex-wrap gap-2">
 {performers.map((p, idx) => (
 <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-[rgba(0,122,255,0.12)] text-blue-800 rounded-full text-sm">
 {p}
 <button type="button"onClick={() => removePerformer(idx)} className="hover:text-macos-red">
 <X className="h-3 w-3"/>
 </button>
 </span>
 ))}
 </div>
 )}
 </div>

 <div className="flex justify-end gap-2 pt-4">
 <Button type="button"variant="ghost"onClick={onCancel}>Отмена</Button>
 <Button type="submit"disabled={isSubmitting}>
 {isSubmitting ? 'Сохранение...' : 'Сохранить'}
 </Button>
 </div>
 </form>
 );
}
