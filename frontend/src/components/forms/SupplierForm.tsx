import { useForm} from 'react-hook-form';
import { z} from 'zod';
import { zodResolver} from '@hookform/resolvers/zod';
import { toast} from 'sonner';
import { Loader2} from 'lucide-react';
import { api} from '../../lib/api';
import { Button} from '../ui/button';
import { Input} from '../ui/input';
import { FormError} from '../ui/FormError';
import { Supplier} from '../../types/procurement';

const formSchema = z.object({
 name: z.string().min(2, 'Название обязательно'),
 contactInfo: z.string().optional(),
 phone: z.string().optional(),
 email: z.string().email('Неверный формат email').optional().or(z.literal('')),
 address: z.string().optional(),
 inn: z.string().optional(),
 isActive: z.boolean().default(true),
});

type SupplierFormData = z.infer<typeof formSchema>;
type SupplierFormProps = { 
 initialData?: Supplier | null; 
 onSuccess: () => void; 
 onCancel: () => void; 
};

export function SupplierForm({ initialData, onSuccess, onCancel}: SupplierFormProps) {
 const { register, handleSubmit, formState: { errors, isSubmitting}} = useForm<SupplierFormData>({
 resolver: zodResolver(formSchema),
 defaultValues: {
 name: initialData?.name || '',
 contactInfo: initialData?.contactInfo || '',
 phone: initialData?.phone || '',
 email: initialData?.email || '',
 address: initialData?.address || '',
 inn: initialData?.inn || '',
 isActive: initialData?.isActive ?? true,
},
});

 const onSubmit = async (data: SupplierFormData) => {
 try {
 if (initialData) {
 await api.put(`/api/procurement/suppliers/${initialData.id}`, data);
} else {
 await api.post('/api/procurement/suppliers', data);
}
 onSuccess();
} catch (error: any) {
 toast.error(error?.message || 'Ошибка сохранения');
}
};

 return (
 <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
 <div>
 <label htmlFor="supplier-name" className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">Название поставщика *</label>
 <Input id="supplier-name" {...register('name')} placeholder="ООО Продукты" error={!!errors.name} aria-describedby={errors.name ? 'supplier-name-error' : undefined}/>
 <FormError message={errors.name?.message} id="supplier-name-error" />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label htmlFor="supplier-phone" className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">Телефон</label>
 <Input id="supplier-phone" {...register('phone')} placeholder="+998 90 123-45-67"/>
 </div>
 <div>
 <label htmlFor="supplier-email" className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">Email</label>
 <Input id="supplier-email" {...register('email')} type="email"placeholder="info@example.com" error={!!errors.email} aria-describedby={errors.email ? 'supplier-email-error' : undefined}/>
 <FormError message={errors.email?.message} id="supplier-email-error" />
 </div>
 </div>

 <div>
 <label htmlFor="supplier-inn" className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">ИНН</label>
 <Input id="supplier-inn" {...register('inn')} placeholder="123456789"/>
 </div>

 <div>
 <label htmlFor="supplier-address" className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">Адрес</label>
 <Input id="supplier-address" {...register('address')} placeholder="г. Ташкент, ул. ..."/>
 </div>

 <div>
 <label htmlFor="supplier-contactInfo" className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">Контактная информация</label>
 <textarea
 id="supplier-contactInfo"
 {...register('contactInfo')}
 className="w-full p-2 border rounded-md text-sm"
 rows={2}
 placeholder="Доп. контактная информация, ФИО менеджера и т.д."
 />
 </div>

 <div className="flex items-center gap-2">
 <input type="checkbox"id="supplier-isActive"{...register('isActive')} className="h-4 w-4"/>
 <label htmlFor="supplier-isActive"className="text-xs font-medium uppercase tracking-widest">Активный поставщик</label>
 </div>

 <div className="flex justify-end gap-2 pt-4">
 <Button type="button"variant="ghost"onClick={onCancel} disabled={isSubmitting}>Отмена</Button>
 <Button type="submit"disabled={isSubmitting}>
 {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
 {isSubmitting ? 'Сохранение...' : initialData ? 'Обновить' : 'Добавить'}
 </Button>
 </div>
 </form>
 );
}
