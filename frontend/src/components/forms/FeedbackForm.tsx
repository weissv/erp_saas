import { useForm} from 'react-hook-form';
import { z} from 'zod';
import { zodResolver} from '@hookform/resolvers/zod';
import { toast} from 'sonner';
import { api} from '../../lib/api';
import { Button} from '../ui/button';
import { Input} from '../ui/input';
import { FormError} from '../ui/FormError';

const formSchema = z.object({
 parentName: z.string().min(3, 'Имя родителя обязательно'),
 contactInfo: z.string().min(5, 'Контактная информация обязательна'),
 type: z.string().min(2, 'Тип обращения обязателен'),
 message: z.string().min(10, 'Сообщение должно быть не менее 10 символов'),
});

type FeedbackFormData = z.infer<typeof formSchema>;
type FeedbackFormProps = { 
 onSuccess: () => void; 
 onCancel: () => void; 
};

export function FeedbackForm({ onSuccess, onCancel}: FeedbackFormProps) {
 const { register, handleSubmit, formState: { errors, isSubmitting}} = useForm<FeedbackFormData>({
 resolver: zodResolver(formSchema),
 defaultValues: {
 parentName: '',
 contactInfo: '',
 type: 'Обращение',
 message: '',
},
});

 const onSubmit = async (data: FeedbackFormData) => {
 try {
 await api.post('/api/feedback', data);
 onSuccess();
} catch (error: any) {
 const msg = error?.message || 'Ошибка сохранения';
 toast.error('Ошибка', { description: msg});
}
};

 return (
 <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest mb-1">Имя родителя</label>
 <Input {...register('parentName')} placeholder="Иванова Мария Петровна"/>
 <FormError message={errors.parentName?.message} />
 </div>

 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest mb-1">Контактная информация</label>
 <Input {...register('contactInfo')} placeholder="maria@example.com или +79991234567"/>
 <FormError message={errors.contactInfo?.message} />
 </div>

 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest mb-1">Тип обращения</label>
 <select 
 {...register('type')} 
 className="w-full px-3 py-2 border border-field rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
 >
 <option value="Обращение">Обращение</option>
 <option value="Жалоба">Жалоба</option>
 <option value="Предложение">Предложение</option>
 </select>
 <FormError message={errors.type?.message} />
 </div>

 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest mb-1">Сообщение</label>
 <textarea
 {...register('message')}
 placeholder="Подробное описание обращения..."
 className="w-full h-32 px-3 py-2 border border-field rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
 />
 <FormError message={errors.message?.message} />
 </div>

 <div className="flex justify-end gap-2 pt-4">
 <Button type="button"variant="ghost"onClick={onCancel}>Отмена</Button>
 <Button type="submit"disabled={isSubmitting}>
 {isSubmitting ? 'Отправка...' : 'Отправить'}
 </Button>
 </div>
 </form>
 );
}
