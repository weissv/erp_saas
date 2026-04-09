import { useForm} from 'react-hook-form';
import { z} from 'zod';
import { zodResolver} from '@hookform/resolvers/zod';
import { toast} from 'sonner';
import { api} from '../../lib/api';
import { ModalNotice, ModalSection} from '../Modal';
import { Button} from '../ui/button';
import { Input} from '../ui/input';
import { FormError} from '../ui/FormError';
import { DocumentTemplate} from '../../types/document';
import { Loader2} from 'lucide-react';

const formSchema = z.object({
 name: z.string().min(2, 'Название обязательно'),
 content: z.string().min(10, 'Содержимое должно быть не менее 10 символов'),
});

type DocumentTemplateFormData = z.infer<typeof formSchema>;
type DocumentTemplateFormProps = { 
 initialData?: DocumentTemplate | null; 
 onSuccess: () => void; 
 onCancel: () => void; 
};

export function DocumentTemplateForm({ initialData, onSuccess, onCancel}: DocumentTemplateFormProps) {
 const { register, handleSubmit, formState: { errors, isSubmitting}} = useForm<DocumentTemplateFormData>({
 resolver: zodResolver(formSchema),
 defaultValues: {
 name: initialData?.name || '',
 content: initialData?.content || '',
},
});

 const onSubmit = async (data: DocumentTemplateFormData) => {
 try {
 if (initialData) {
 await api.put(`/api/documents/templates/${initialData.id}`, data);
} else {
 await api.post('/api/documents/templates', data);
}
 onSuccess();
} catch (error: any) {
 const msg = error?.message || 'Ошибка сохранения';
 toast.error('Ошибка', { description: msg});
}
};

 return (
 <form onSubmit={handleSubmit(onSubmit)} className="mezon-modal-form">
 <ModalSection title="Параметры шаблона" description="Название и содержание должны быть понятными, чтобы сотрудники быстро выбирали нужный шаблон из списка.">
 <div>
 <label htmlFor="tpl-name" className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">Название шаблона</label>
 <Input id="tpl-name" {...register('name')} placeholder="Договор стандартный" error={!!errors.name} aria-describedby={errors.name ? 'tpl-name-error' : undefined}/>
 <FormError message={errors.name?.message} id="tpl-name-error" />
 </div>

 <div>
 <label htmlFor="tpl-content" className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">Содержимое</label>
 <textarea
 id="tpl-content"
 {...register('content')}
 placeholder="Шаблон документа..."
 className="mezon-field mezon-textarea"
 aria-describedby={errors.content ? 'tpl-content-error' : undefined}
 />
 <FormError message={errors.content?.message} id="tpl-content-error" />
 </div>

 <ModalNotice title="Подсказка" tone="info">
 Используйте содержание как основу для типового документа. Чем яснее структура шаблона, тем меньше ручных правок потребуется потом.
 </ModalNotice>
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
