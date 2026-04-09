import { useForm} from 'react-hook-form';
import { z} from 'zod';
import { zodResolver} from '@hookform/resolvers/zod';
import { toast} from 'sonner';
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
 <label className="block text-[11px] font-medium uppercase tracking-widest mb-1">Название поставщика *</label>
 <Input {...register('name')} placeholder="ООО Продукты"/>
 <FormError message={errors.name?.message} />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest mb-1">Телефон</label>
 <Input {...register('phone')} placeholder="+998 90 123-45-67"/>
 </div>
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest mb-1">Email</label>
 <Input {...register('email')} type="email"placeholder="info@example.com"/>
 <FormError message={errors.email?.message} />
 </div>
 </div>

 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest mb-1">ИНН</label>
 <Input {...register('inn')} placeholder="123456789"/>
 </div>

 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest mb-1">Адрес</label>
 <Input {...register('address')} placeholder="г. Ташкент, ул. ..."/>
 </div>

 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest mb-1">Контактная информация</label>
 <textarea
 {...register('contactInfo')}
 className="w-full p-2 border rounded-md text-sm"
 rows={2}
 placeholder="Доп. контактная информация, ФИО менеджера и т.д."
 />
 </div>

 <div className="flex items-center gap-2">
 <input type="checkbox"id="isActive"{...register('isActive')} className="h-4 w-4"/>
 <label htmlFor="isActive"className="text-[11px] font-medium uppercase tracking-widest">Активный поставщик</label>
 </div>

 <div className="flex justify-end gap-2 pt-4">
 <Button type="button"variant="ghost"onClick={onCancel}>Отмена</Button>
 <Button type="submit"disabled={isSubmitting}>
 {isSubmitting ? 'Сохранение...' : initialData ? 'Обновить' : 'Добавить'}
 </Button>
 </div>
 </form>
 );
}
