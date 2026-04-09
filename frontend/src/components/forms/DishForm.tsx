import { useEffect, useState} from 'react';
import { useForm, useFieldArray} from 'react-hook-form';
import { z} from 'zod';
import { zodResolver} from '@hookform/resolvers/zod';
import { toast} from 'sonner';
import { api} from '../../lib/api';
import { Button} from '../ui/button';
import { Input} from '../ui/input';
import { FormError} from '../ui/FormError';
import { Dish} from '../../types/recipe';
import { PlusCircle, Trash2} from 'lucide-react';

const ingredientSchema = z.object({
 ingredientId: z.coerce.number().positive('Выберите ингредиент'),
 quantity: z.coerce.number().positive('Количество должно быть > 0'),
});

const formSchema = z.object({
 name: z.string().min(2, 'Название обязательно'),
 category: z.string().min(2, 'Категория обязательна'),
 preparationTime: z.coerce.number().positive('Время приготовления должно быть > 0'),
 ingredients: z.array(ingredientSchema).min(1, 'Добавьте хотя бы один ингредиент'),
});

type DishFormData = z.infer<typeof formSchema>;
type DishFormProps = { 
 initialData?: Dish | null; 
 onSuccess: () => void; 
 onCancel: () => void; 
};

interface Ingredient { id: number; name: string; unit: string;}

export function DishForm({ initialData, onSuccess, onCancel}: DishFormProps) {
 const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([]);
 const [isLoadingIngredients, setIsLoadingIngredients] = useState(false);

 const { register, handleSubmit, control, formState: { errors, isSubmitting}} = useForm<DishFormData>({
 resolver: zodResolver(formSchema),
 defaultValues: {
 name: initialData?.name || '',
 category: initialData?.category || '',
 preparationTime: initialData?.preparationTime || 30,
 ingredients: initialData?.ingredients?.map(ing => ({
 ingredientId: ing.ingredientId,
 quantity: ing.quantity,
})) || [{ ingredientId: 0, quantity: 0}],
},
});

 const { fields, append, remove} = useFieldArray({
 control,
 name: 'ingredients',
});

 // Загрузка списка ингредиентов
 useEffect(() => {
 setIsLoadingIngredients(true);
 api.get('/api/recipes/ingredients')
 .then((data) => {
 setAvailableIngredients(Array.isArray(data) ? data : []);
})
 .catch((error: any) => {
 toast.error('Не удалось загрузить ингредиенты', { description: error?.message});
})
 .finally(() => setIsLoadingIngredients(false));
}, []);

 const onSubmit = async (data: DishFormData) => {
 try {
 if (initialData) {
 await api.put(`/api/recipes/dishes/${initialData.id}`, data);
} else {
 await api.post('/api/recipes/dishes', data);
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
 <label className="block text-[11px] font-medium uppercase tracking-widest mb-1">Название блюда *</label>
 <Input {...register('name')} placeholder="Молочная каша"/>
 <FormError message={errors.name?.message} />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest mb-1">Категория *</label>
 <select 
 {...register('category')} 
 className="w-full px-3 py-2 border border-field rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
 >
 <option value="">Выберите категорию</option>
 <option value="Завтрак">Завтрак</option>
 <option value="Обед">Обед</option>
 <option value="Полдник">Полдник</option>
 <option value="Ужин">Ужин</option>
 </select>
 <FormError message={errors.category?.message} />
 </div>

 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest mb-1">Время приготовления (мин)</label>
 <Input type="number"{...register('preparationTime')} placeholder="30"/>
 <FormError message={errors.preparationTime?.message} />
 </div>
 </div>

 <div className="border-t pt-4">
 <div className="flex justify-between items-center mb-3">
 <h3 className="font-medium">Состав блюда</h3>
 <Button 
 type="button"
 variant="outline"
 size="sm"
 onClick={() => append({ ingredientId: 0, quantity: 0})}
 >
 <PlusCircle className="h-4 w-4 mr-1"/> Добавить ингредиент
 </Button>
 </div>

 {fields.map((field, index) => (
 <div key={field.id} className="flex gap-2 mb-2 items-start">
 <div className="flex-1">
 <select
 className="w-full rounded-md border border-field px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm"
 {...register(`ingredients.${index}.ingredientId`, { valueAsNumber: true})}
 disabled={isLoadingIngredients}
 >
 <option value="">{isLoadingIngredients ? 'Загрузка...' : 'Выберите ингредиент'}</option>
 {availableIngredients.map((ing) => (
 <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
 ))}
 </select>
 </div>
 <div className="w-32">
 <Input 
 type="number"
 step="0.01"
 placeholder="Кол-во"
 {...register(`ingredients.${index}.quantity`)}
 />
 </div>
 <Button 
 type="button"
 variant="destructive"
 size="sm"
 onClick={() => remove(index)}
 disabled={fields.length === 1}
 >
 <Trash2 className="h-4 w-4"/>
 </Button>
 </div>
 ))}
 {errors.ingredients && <FormError message={errors.ingredients.message} />}
 </div>

 <div className="flex justify-end gap-2 pt-4">
 <Button type="button"variant="ghost"onClick={onCancel}>Отмена</Button>
 <Button type="submit"disabled={isSubmitting}>
 {isSubmitting ? 'Сохранение...' : 'Сохранить блюдо'}
 </Button>
 </div>
 </form>
 );
}
