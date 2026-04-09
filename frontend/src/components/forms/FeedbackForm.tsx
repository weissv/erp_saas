import { useForm} from 'react-hook-form';
import { z} from 'zod';
import { zodResolver} from '@hookform/resolvers/zod';
import { toast} from 'sonner';
import { Loader2 } from 'lucide-react';
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
 <label htmlFor="fb-parentName" className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">Имя родителя</label>
 <Input id="fb-parentName" {...register('parentName')} placeholder="Иванова Мария Петровна" error={!!errors.parentName} aria-describedby={errors.parentName ? 'fb-parentName-error' : undefined}/>
 <FormError message={errors.parentName?.message} id="fb-parentName-error" />
 </div>

 <div>
 <label htmlFor="fb-contactInfo" className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">Контактная информация</label>
 <Input id="fb-contactInfo" {...register('contactInfo')} placeholder="maria@example.com или +79991234567" error={!!errors.contactInfo} aria-describedby={errors.contactInfo ? 'fb-contactInfo-error' : undefined}/>
 <FormError message={errors.contactInfo?.message} id="fb-contactInfo-error" />
 </div>

 <div>
 <label htmlFor="fb-type" className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">Тип обращения</label>
 <select 
 id="fb-type"
 {...register('type')} 
 className="w-full px-3 py-2 border border-field rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
 aria-describedby={errors.type ? 'fb-type-error' : undefined}
 >
 <option value="Обращение">Обращение</option>
 <option value="Жалоба">Жалоба</option>
 <option value="Предложение">Предложение</option>
 </select>
 <FormError message={errors.type?.message} id="fb-type-error" />
 </div>

 <div>
 <label htmlFor="fb-message" className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">Сообщение</label>
 <textarea
 id="fb-message"
 {...register('message')}
 placeholder="Подробное описание обращения..."
 className="w-full h-32 px-3 py-2 border border-field rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
 aria-describedby={errors.message ? 'fb-message-error' : undefined}
 />
 <FormError message={errors.message?.message} id="fb-message-error" />
 </div>

 <div className="flex justify-end gap-2 pt-4">
 <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>Отмена</Button>
 <Button type="submit" disabled={isSubmitting}>
 {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
 {isSubmitting ? 'Отправка...' : 'Отправить'}
 </Button>
 </div>
 </form>
 );
}
