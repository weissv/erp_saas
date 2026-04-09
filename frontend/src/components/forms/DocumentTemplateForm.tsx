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
 <label className="mezon-form-label">Название шаблона</label>
 <Input {...register('name')} placeholder="Договор стандартный"/>
 <FormError message={errors.name?.message} />
 </div>

 <div>
 <label className="mezon-form-label">Содержимое</label>
 <textarea
 {...register('content')}
 placeholder="Шаблон документа..."
 className="mezon-field mezon-textarea"
 />
 <FormError message={errors.content?.message} />
 </div>

 <ModalNotice title="Подсказка" tone="info">
 Используйте содержание как основу для типового документа. Чем яснее структура шаблона, тем меньше ручных правок потребуется потом.
 </ModalNotice>
 </ModalSection>

 <div className="mezon-modal-inline-actions">
 <Button type="button"variant="ghost"onClick={onCancel}>Отмена</Button>
 <Button type="submit"disabled={isSubmitting}>
 {isSubmitting ? 'Сохранение...' : 'Сохранить'}
 </Button>
 </div>
 </form>
 );
}
