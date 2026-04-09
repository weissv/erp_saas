import { useForm} from 'react-hook-form';
import { z} from 'zod';
import { zodResolver} from '@hookform/resolvers/zod';
import { toast} from 'sonner';
import { api} from '../../lib/api';
import { Button} from '../ui/button';
import { Input} from '../ui/input';
import { FormError} from '../ui/FormError';
import { Ingredient} from '../../types/recipe';

const formSchema = z.object({
 name: z.string().min(2, 'Название обязательно'),
 unit: z.string().min(1, 'Единица измерения обязательна'),
 calories: z.coerce.number().min(0, 'Калории не могут быть отрицательными'),
 protein: z.coerce.number().min(0, 'Белки не могут быть отрицательными'),
 fat: z.coerce.number().min(0, 'Жиры не могут быть отрицательными'),
 carbs: z.coerce.number().min(0, 'Углеводы не могут быть отрицательными'),
});

type IngredientFormData = z.infer<typeof formSchema>;
type IngredientFormProps = { 
 initialData?: Ingredient | null; 
 onSuccess: () => void; 
 onCancel: () => void; 
};

export function IngredientForm({ initialData, onSuccess, onCancel}: IngredientFormProps) {
 const { register, handleSubmit, formState: { errors, isSubmitting}} = useForm<IngredientFormData>({
 resolver: zodResolver(formSchema),
 defaultValues: {
 name: initialData?.name || '',
 unit: initialData?.unit || '',
 calories: initialData?.calories || 0,
 protein: initialData?.protein || 0,
 fat: initialData?.fat || 0,
 carbs: initialData?.carbs || 0,
},
});

 const onSubmit = async (data: IngredientFormData) => {
 try {
 if (initialData) {
 await api.put(`/api/recipes/ingredients/${initialData.id}`, data);
} else {
 await api.post('/api/recipes/ingredients', data);
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
 <label className="block text-[11px] font-medium uppercase tracking-widest mb-1">Название ингредиента</label>
 <Input {...register('name')} placeholder="Картофель"/>
 <FormError message={errors.name?.message} />
 </div>

 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest mb-1">Единица измерения</label>
 <Input {...register('unit')} placeholder="кг"/>
 <FormError message={errors.unit?.message} />
 <p className="text-xs text-secondary mt-1">Например: кг, л, шт</p>
 </div>

 <div className="border-t pt-4">
 <h3 className="font-medium mb-3">Пищевая ценность на 1 {initialData?.unit || 'единицу'}</h3>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest mb-1">Калорийность (ккал)</label>
 <Input type="number"step="0.1"{...register('calories')} placeholder="77"/>
 <FormError message={errors.calories?.message} />
 </div>

 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest mb-1">Белки (г)</label>
 <Input type="number"step="0.1"{...register('protein')} placeholder="2.0"/>
 <FormError message={errors.protein?.message} />
 </div>

 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest mb-1">Жиры (г)</label>
 <Input type="number"step="0.1"{...register('fat')} placeholder="0.1"/>
 <FormError message={errors.fat?.message} />
 </div>

 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest mb-1">Углеводы (г)</label>
 <Input type="number"step="0.1"{...register('carbs')} placeholder="17.0"/>
 <FormError message={errors.carbs?.message} />
 </div>
 </div>
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
