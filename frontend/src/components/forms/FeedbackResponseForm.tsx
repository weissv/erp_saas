import { useForm} from 'react-hook-form';
import { z} from 'zod';
import { zodResolver} from '@hookform/resolvers/zod';
import { toast} from 'sonner';
import { api} from '../../lib/api';
import { ModalNotice, ModalSection} from '../Modal';
import { Loader2 } from 'lucide-react';
import { Button} from '../ui/button';
import { FormError} from '../ui/FormError';
import { Feedback} from '../../types/feedback';

const formSchema = z.object({
 response: z.string().min(10, 'Ответ должен быть не менее 10 символов'),
 status: z.enum(['IN_PROGRESS', 'RESOLVED']),
});

type FeedbackResponseFormData = z.infer<typeof formSchema>;
type FeedbackResponseFormProps = { 
 feedback: Feedback;
 onSuccess: () => void; 
 onCancel: () => void; 
};

export function FeedbackResponseForm({ feedback, onSuccess, onCancel}: FeedbackResponseFormProps) {
 const { register, handleSubmit, formState: { errors, isSubmitting}} = useForm<FeedbackResponseFormData>({
 resolver: zodResolver(formSchema),
 defaultValues: {
 response: feedback.response || '',
 status: feedback.status === 'NEW' ? 'IN_PROGRESS' : feedback.status,
},
});

 const onSubmit = async (data: FeedbackResponseFormData) => {
 try {
 await api.put(`/api/feedback/${feedback.id}`, data);
 onSuccess();
} catch (error: any) {
 const msg = error?.message || 'Ошибка сохранения';
 toast.error('Ошибка', { description: msg});
}
};

 return (
 <form onSubmit={handleSubmit(onSubmit)} className="mezon-modal-form">
 <ModalSection title="Исходное обращение" description="Перед ответом сверьте автора, контакты и текст сообщения, чтобы не потерять контекст переписки.">
 <div className="mezon-modal-facts">
 <div className="mezon-modal-fact">
 <span className="mezon-modal-fact__label">Автор</span>
 <span className="mezon-modal-fact__value">{feedback.parentName}</span>
 </div>
 <div className="mezon-modal-fact">
 <span className="mezon-modal-fact__label">Контакты</span>
 <span className="mezon-modal-fact__value">{feedback.contactInfo}</span>
 </div>
 <div className="mezon-modal-fact">
 <span className="mezon-modal-fact__label">Тип</span>
 <span className="mezon-modal-fact__value">{feedback.type}</span>
 </div>
 </div>

 <ModalNotice title="Сообщение" tone="info">
 {feedback.message}
 </ModalNotice>
 </ModalSection>

 <ModalSection title="Ответ и статус" description="Сформулируйте понятный ответ и сразу переведите обращение в актуальный статус.">
 <div>
 <label htmlFor="fbr-response" className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">Ответ</label>
 <textarea
 id="fbr-response"
 {...register('response')}
 placeholder="Ваш ответ на обращение..."
 className="mezon-field mezon-textarea"
 aria-describedby={errors.response ? 'fbr-response-error' : undefined}
 />
 <FormError message={errors.response?.message} id="fbr-response-error" />
 </div>

 <div>
 <label htmlFor="fbr-status" className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">Статус</label>
 <select 
 id="fbr-status"
 {...register('status')} 
 className="mezon-field"
 aria-describedby={errors.status ? 'fbr-status-error' : undefined}
 >
 <option value="IN_PROGRESS">В работе</option>
 <option value="RESOLVED">Решено</option>
 </select>
 <FormError message={errors.status?.message} id="fbr-status-error" />
 </div>
 </ModalSection>

 <div className="mezon-modal-inline-actions">
 <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>Отмена</Button>
 <Button type="submit" disabled={isSubmitting}>
 {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
 {isSubmitting ? 'Сохранение...' : 'Сохранить ответ'}
 </Button>
 </div>
 </form>
 );
}
