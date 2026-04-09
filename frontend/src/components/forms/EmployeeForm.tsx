import { useForm} from 'react-hook-form';
import { z} from 'zod';
import { zodResolver} from '@hookform/resolvers/zod';
import { toast} from 'sonner';
import { api} from '../../lib/api';
import { Button} from '../ui/button';
import { Input} from '../ui/input';
import { FormError} from '../ui/FormError';

const formSchema = z.object({
 firstName: z.string().min(2, 'Имя обязательно'),
 lastName: z.string().min(2, 'Фамилия обязательна'),
 birthDate: z.string().optional(),
 position: z.string().min(2, 'Должность обязательна'),
 rate: z.coerce.number().positive('Ставка должна быть > 0'),
 hireDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Неверная дата'),
});

type EmployeeFormData = z.infer<typeof formSchema>;
type Employee = { id: number; firstName: string; lastName: string; birthDate?: string; position: string; rate: number; hireDate: string};
type EmployeeFormProps = { initialData?: Employee | null; onSuccess: () => void; onCancel: () => void;};

export function EmployeeForm({ initialData, onSuccess, onCancel}: EmployeeFormProps) {
 const { register, handleSubmit, formState: { errors, isSubmitting}} = useForm<EmployeeFormData>({
 resolver: zodResolver(formSchema),
 defaultValues: {
 firstName: initialData?.firstName || '',
 lastName: initialData?.lastName || '',
 birthDate: initialData?.birthDate ? new Date(initialData.birthDate).toISOString().split('T')[0] : '',
 position: initialData?.position || '',
 rate: initialData?.rate || 1,
 hireDate: initialData ? new Date(initialData.hireDate).toISOString().split('T')[0] : '',
},
});

 const onSubmit = async (data: EmployeeFormData) => {
 try {
 const payload = {
 ...data,
 birthDate: data.birthDate ? new Date(data.birthDate).toISOString() : null,
 hireDate: new Date(data.hireDate).toISOString(),
};
 if (initialData) {
 await api.put(`/api/employees/${initialData.id}`, payload);
} else {
 await api.post('/api/employees', payload);
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
 <label className="block text-[11px] font-medium uppercase tracking-widest text-primary mb-1">Имя *</label>
 <Input {...register('firstName')} placeholder="Введите имя"/>
 <FormError message={errors.firstName?.message} />
 </div>
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest text-primary mb-1">Фамилия *</label>
 <Input {...register('lastName')} placeholder="Введите фамилию"/>
 <FormError message={errors.lastName?.message} />
 </div>
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest text-primary mb-1">Дата рождения</label>
 <Input type="date"{...register('birthDate')} />
 <FormError message={errors.birthDate?.message} />
 </div>
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest text-primary mb-1">Должность *</label>
 <Input {...register('position')} placeholder="Например: Учитель"/>
 <FormError message={errors.position?.message} />
 </div>
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest text-primary mb-1">Ставка *</label>
 <Input type="number"step="0.1"{...register('rate')} placeholder="1.0"/>
 <FormError message={errors.rate?.message} />
 </div>
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest text-primary mb-1">Дата приёма *</label>
 <Input type="date"{...register('hireDate')} />
 <FormError message={errors.hireDate?.message} />
 </div>
 <div className="flex justify-end gap-2 pt-4">
 <Button type="button"variant="ghost"onClick={onCancel}>Отмена</Button>
 <Button type="submit"disabled={isSubmitting}>{isSubmitting ? 'Сохранение...' : 'Сохранить'}</Button>
 </div>
 </form>
 );
}