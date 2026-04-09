// src/pages/MenuPage.tsx
import { useState, useEffect} from 'react';
import { useForm, useFieldArray} from 'react-hook-form';
import { zodResolver} from '@hookform/resolvers/zod';
import { z} from 'zod';
import { toast} from 'sonner';
import { api} from '../lib/api';
import { Card} from '../components/Card';
import {
 Modal,
 ModalActions,
 ModalGrid,
 ModalNotice,
 ModalSection,
 ModalStat,
} from '../components/Modal';
import { Button} from '../components/ui/button';
import { Input} from '../components/ui/input';
import { FormError} from '../components/ui/FormError';
import { Calculator, ShoppingCart, Trash2, AlertTriangle} from 'lucide-react';

const mealSchema = z.object({
 name: z.string().min(1, 'Название приема пищи обязательно'),
 dish: z.string().min(1, 'Название блюда обязательно'),
 calories: z.coerce.number().optional(),
});

const menuFormSchema = z.object({
 date: z.string(),
 ageGroup: z.string().min(1, 'Возрастная группа обязательна'),
 meals: z.array(mealSchema).min(1, 'Добавьте хотя бы один прием пищи'),
});

type MenuFormData = z.infer<typeof menuFormSchema>;

const getStartOfWeek = (date: Date) => {
 const d = new Date(date);
 const day = d.getDay();
 const diff = d.getDate() - day + (day === 0 ? -6 : 1);
 return new Date(d.setDate(diff));
};

export default function MenuPage() {
 const [menus, setMenus] = useState<any[]>([]);
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [selectedDate, setSelectedDate] = useState<Date | null>(null);
 const [weekStart, setWeekStart] = useState(getStartOfWeek(new Date()));
 const [kbzhuData, setKbzhuData] = useState<any>(null);
 const [shoppingList, setShoppingList] = useState<any>(null);
 const [selectedMenuId, setSelectedMenuId] = useState<number | null>(null);
 const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
 const [isDeleting, setIsDeleting] = useState(false);
 const menuFormId = 'menu-editor-form';

 const {
 register,
 handleSubmit,
 control,
 reset,
 formState: { errors},
} = useForm<MenuFormData>({
 resolver: zodResolver(menuFormSchema),
 defaultValues: {
 date: '',
 ageGroup: '1-3 года',
 meals: [{ name: 'Завтрак', dish: '', calories: 0}],
 },
});

 const { fields, append, remove} = useFieldArray({
 control,
 name: 'meals',
});

 const fetchMenu = async (start: Date) => {
 const end = new Date(start);
 end.setDate(end.getDate() + 6);
 try {
 const startDate = start.toISOString();
 const endDate = end.toISOString();
 const response = await api.get(`/api/menu?startDate=${startDate}&endDate=${endDate}`);
 setMenus(response.data.items || []);
 } catch (error) {
 console.error('Failed to fetch menu:', error);
 }
 };

 useEffect(() => {
 fetchMenu(weekStart);
 }, [weekStart]);

 const handleOpenModal = (date: Date) => {
 const existingMenu = menus.find((menu) => new Date(menu.date).toDateString() === date.toDateString());

 if (existingMenu) {
 reset({
 date: date.toISOString().split('T')[0],
 ageGroup: existingMenu.ageGroup,
 meals: existingMenu.meals.map((meal: any) => ({
 name: meal.name,
 dish: meal.dish,
 calories: meal.calories,
 })),
 });
 } else {
 reset({
 date: date.toISOString().split('T')[0],
 ageGroup: '1-3 года',
 meals: [{ name: 'Завтрак', dish: '', calories: 0}],
 });
 }

 setSelectedDate(date);
 setIsModalOpen(true);
 };

 const onSubmit = async (data: MenuFormData) => {
 try {
 const payload = {
 ...data,
 date: new Date(data.date).toISOString(),
 };
 await api.post('/menu', payload);
 setIsModalOpen(false);
 fetchMenu(weekStart);
 } catch (error) {
 console.error('Failed to save menu:', error);
 alert('Не удалось сохранить меню. Посмотрите в консоль для деталей.');
 }
 };

 const changeWeek = (offset: number) => {
 const newWeekStart = new Date(weekStart);
 newWeekStart.setDate(newWeekStart.getDate() + offset);
 setWeekStart(newWeekStart);
 };

 const handleCalculateKBZHU = async (menuId: number) => {
 try {
 const result = await api.post(`/api/menu/${menuId}/calculate-kbju`, {});
 setKbzhuData(result);
 setSelectedMenuId(menuId);
 toast.success('КБЖУ рассчитано успешно');
 } catch (error: any) {
 toast.error('Ошибка расчета КБЖУ', { description: error?.message});
 }
 };

 const handleGenerateShoppingList = async (menuId: number, portions: number = 25) => {
 try {
 const result = await api.get(`/api/menu/${menuId}/shopping-list?portions=${portions}`);
 setShoppingList(result);
 setSelectedMenuId(menuId);
 toast.success('Список покупок сформирован');
 } catch (error: any) {
 toast.error('Ошибка генерации списка', { description: error?.message});
 }
 };

 const handleDeleteMenu = async () => {
 if (!deleteConfirm) return;

 setIsDeleting(true);
 try {
 await api.delete(`/api/menu/${deleteConfirm.id}`);
 toast.success('Меню удалено');
 setDeleteConfirm(null);
 fetchMenu(weekStart);
 } catch (error: any) {
 toast.error('Ошибка удаления меню', { description: error?.message});
 } finally {
 setIsDeleting(false);
 }
 };

 const renderDay = (date: Date) => {
 const menuForDay = menus.find((menu) => new Date(menu.date).toDateString() === date.toDateString());

 return (
 <div key={date.toISOString()}>
 <Card className="flex-1 min-w-[200px]">
 <div className="p-4">
 <h3 className="font-bold text-lg">{date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long'})}</h3>
 {menuForDay ? (
 <div className="mt-2">
 <p className="font-semibold text-sm text-secondary">{menuForDay.ageGroup}</p>
 <ul className="mt-1 list-disc list-inside">
 {menuForDay.meals.map((meal: any, index: number) => (
 <li key={index}><strong>{meal.name}:</strong> {meal.dish} ({meal.calories} ккал)</li>
 ))}
 </ul>
 <div className="flex gap-2 mt-3">
 <Button
 size="sm"
 variant="outline"
 onClick={() => handleCalculateKBZHU(menuForDay.id)}
 className="flex-1"
 >
 <Calculator className="h-3 w-3 mr-1"/> КБЖУ
 </Button>
 <Button
 size="sm"
 variant="outline"
 onClick={() => handleGenerateShoppingList(menuForDay.id)}
 className="flex-1"
 >
 <ShoppingCart className="h-3 w-3 mr-1"/> Список
 </Button>
 <Button
 size="sm"
 variant="outline"
 onClick={() => setDeleteConfirm(menuForDay)}
 className="text-macos-red hover:text-macos-red hover:bg-[rgba(255,59,48,0.06)]"
 >
 <Trash2 className="h-3 w-3"/>
 </Button>
 </div>
 </div>
 ) : (
 <p className="text-tertiary mt-2">Меню не составлено</p>
 )}
 <Button onClick={() => handleOpenModal(date)} className="mt-4 w-full">
 {menuForDay ? 'Редактировать' : 'Создать'}
 </Button>
 </div>
 </Card>
 </div>
 );
 };

 const weekDates = Array.from({ length: 5}).map((_, index) => {
 const date = new Date(weekStart);
 date.setDate(date.getDate() + index);
 return date;
 });

 return (
 <div>
 <div className="flex justify-between items-center mb-4">
 <h1 className="mezon-section-title text-2xl">Меню на неделю</h1>
 <div className="flex items-center gap-2">
 <Button onClick={() => changeWeek(-7)}>Пред. неделя</Button>
 <span className="font-semibold">
 {weekStart.toLocaleDateString('ru-RU')} - {new Date(weekStart.getTime() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU')}
 </span>
 <Button onClick={() => changeWeek(7)}>След. неделя</Button>
 </div>
 </div>

 <div className="flex gap-4 overflow-x-auto pb-4">
 {weekDates.map((date) => renderDay(date))}
 </div>

 <Modal
 isOpen={!!kbzhuData}
 onClose={() => setKbzhuData(null)}
 title="Пищевая ценность меню"
 eyebrow="Аналитика рациона"
 description="Быстрая сводка по калориям и нутриентам на выбранный день, чтобы повару и администратору было проще сверить баланс меню."
 icon={<Calculator className="h-5 w-5"/>}
 size="lg"
 meta={kbzhuData ? <span className="mezon-badge macos-badge-neutral">{kbzhuData.ageGroup}</span> : null}
 >
 {kbzhuData ? (
 <>
 <ModalGrid>
 <ModalStat label="Калорийность" value={`${kbzhuData.kbju?.calories?.toFixed(1) || 0} ккал`} tone="warning"/>
 <ModalStat label="Белки" value={`${kbzhuData.kbju?.protein?.toFixed(1) || 0} г`} tone="info"/>
 <ModalStat label="Жиры" value={`${kbzhuData.kbju?.fat?.toFixed(1) || 0} г`} tone="warning"/>
 <ModalStat label="Углеводы" value={`${kbzhuData.kbju?.carbs?.toFixed(1) || 0} г`} tone="success"/>
 </ModalGrid>

 <ModalNotice title="Как читать эти данные" tone="info">
 Значения помогают быстро понять, насколько дневной рацион соответствует возрастной группе и не перегружен ли он по калорийности или отдельным нутриентам.
 </ModalNotice>
 </>
 ) : null}
 </Modal>

 <Modal
 isOpen={!!shoppingList}
 onClose={() => setShoppingList(null)}
 title="Список покупок"
 eyebrow="Подготовка закупки"
 description="Список рассчитан по порциям на выбранную дату и сразу показывает, что уже есть на складе, а что нужно докупить."
 icon={<ShoppingCart className="h-5 w-5"/>}
 size="xl"
 meta={shoppingList ? <span className="mezon-badge macos-badge-neutral">{shoppingList.portions} порций</span> : null}
 >
 {shoppingList ? (
 <>
 <ModalSection title="Сводка по заказу" description="Коротко о параметрах расчёта списка.">
 <div className="mezon-modal-facts">
 <div className="mezon-modal-fact">
 <span className="mezon-modal-fact__label">Дата</span>
 <span className="mezon-modal-fact__value">{shoppingList.date && new Date(shoppingList.date).toLocaleDateString('ru-RU')}</span>
 </div>
 <div className="mezon-modal-fact">
 <span className="mezon-modal-fact__label">Порций</span>
 <span className="mezon-modal-fact__value">{shoppingList.portions}</span>
 </div>
 <div className="mezon-modal-fact">
 <span className="mezon-modal-fact__label">Позиций</span>
 <span className="mezon-modal-fact__value">{shoppingList.items?.length || 0}</span>
 </div>
 </div>
 </ModalSection>

 <ModalSection title="Позиции для закупки" description="Самые важные значения вынесены в карточки, чтобы не искать глазами по строке.">
 <div className="space-y-3">
 {shoppingList.items?.map((item: any, index: number) => (
 <div key={index} className="rounded-[18px] border border-[rgba(15,23,42,0.08)] bg-[rgba(255,255,255,0.74)] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
 <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
 <div>
 <p className="text-[15px] font-semibold tracking-[-0.015em] text-primary">{item.ingredientName}</p>
 <p className="mt-1 text-[13px] text-secondary">Единица учета: {item.unit}</p>
 </div>
 <div className="grid min-w-[220px] grid-cols-1 gap-2 text-left sm:text-right">
 <div className="text-sm">
 Нужно: <span className="font-semibold text-primary">{item.requiredQty} {item.unit}</span>
 </div>
 <div className="text-sm text-secondary">
 На складе: {item.inStock} {item.unit}
 </div>
 {item.toBuy > 0 ? (
 <div className="text-sm font-bold text-macos-red">
 Купить: {item.toBuy} {item.unit}
 </div>
 ) : null}
 </div>
 </div>
 </div>
 ))}
 </div>
 </ModalSection>
 </>
 ) : null}
 </Modal>

 {isModalOpen && selectedDate ? (
 <Modal
 isOpen={isModalOpen}
 onClose={() => setIsModalOpen(false)}
 title={`Меню на ${selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long'})}`}
 eyebrow="Планирование питания"
 description="Соберите рацион на день так, чтобы повару было удобно редактировать список приёмов пищи и сразу видеть структуру меню."
 size="xl"
 footer={
 <ModalActions>
 <Button type="button"variant="secondary"onClick={() => setIsModalOpen(false)}>
 Отмена
 </Button>
 <Button form={menuFormId} type="submit">Сохранить меню</Button>
 </ModalActions>
 }
 >
 <form id={menuFormId} onSubmit={handleSubmit(onSubmit)} className="mezon-modal-form">
 <ModalSection title="Параметры дня" description="Базовые настройки, от которых зависит состав меню.">
 <div className="grid gap-4 md:grid-cols-2">
 <div>
 <label htmlFor="ageGroup"className="mezon-form-label">Возрастная группа</label>
 <select {...register('ageGroup')} id="ageGroup"className="mezon-field w-full">
 <option>1-3 года</option>
 <option>3-7 лет</option>
 </select>
 {errors.ageGroup ? <FormError message={errors.ageGroup.message} /> : null}
 </div>

 <div>
 <span className="mezon-form-label">Дата меню</span>
 <div className="mezon-field flex items-center bg-[rgba(255,255,255,0.64)] text-primary">
 {selectedDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long'})}
 </div>
 </div>
 </div>

 <p className="mezon-form-helper">
 Сначала задайте возрастную группу, затем заполните блюда и калорийность по каждому приёму пищи.
 </p>
 </ModalSection>

 <ModalSection title="Приёмы пищи" description="Разбейте меню по этапам дня и укажите основное блюдо для каждой позиции.">
 {fields.map((field, index) => (
 <div key={field.id} className="rounded-[18px] border border-[rgba(15,23,42,0.08)] bg-[rgba(255,255,255,0.76)] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
 <div className="mb-4 flex items-start justify-between gap-3">
 <div>
 <p className="text-[15px] font-semibold tracking-[-0.015em] text-primary">Приём пищи {index + 1}</p>
 <p className="mt-1 text-[13px] text-secondary">Отдельная карточка помогает быстрее редактировать рацион без путаницы между блюдами.</p>
 </div>
 <Button type="button"variant="destructive"size="sm"onClick={() => remove(index)}>
 Удалить
 </Button>
 </div>

 <div className="grid gap-4 md:grid-cols-2">
 <div>
 <label className="mezon-form-label">Название</label>
 <Input {...register(`meals.${index}.name`)} placeholder="Например, Завтрак"/>
 {errors.meals?.[index]?.name ? <FormError message={errors.meals[index]?.name?.message} /> : null}
 </div>

 <div>
 <label className="mezon-form-label">Калорийность</label>
 <Input type="number"{...register(`meals.${index}.calories`)} placeholder="320"/>
 {errors.meals?.[index]?.calories ? <FormError message={errors.meals[index]?.calories?.message} /> : null}
 </div>

 <div className="md:col-span-2">
 <label className="mezon-form-label">Блюдо</label>
 <Input {...register(`meals.${index}.dish`)} placeholder="Например, Каша овсяная"/>
 {errors.meals?.[index]?.dish ? <FormError message={errors.meals[index]?.dish?.message} /> : null}
 </div>
 </div>
 </div>
 ))}

 {errors.meals?.root ? <FormError message={errors.meals.root.message} /> : null}

 <Button type="button"variant="outline"onClick={() => append({ name: '', dish: '', calories: 0})}>
 Добавить прием пищи
 </Button>
 </ModalSection>
 </form>
 </Modal>
 ) : null}

 <Modal
 isOpen={!!deleteConfirm}
 onClose={() => setDeleteConfirm(null)}
 title="Удаление меню"
 eyebrow="Опасное действие"
 description="Меню на выбранный день будет удалено без возможности восстановления. Перед подтверждением проверьте дату и возрастную группу."
 icon={<AlertTriangle className="h-5 w-5"/>}
 tone="danger"
 closeOnBackdrop={!isDeleting}
 closeOnEscape={!isDeleting}
 footer={
 <ModalActions>
 <Button variant="outline"onClick={() => setDeleteConfirm(null)} disabled={isDeleting}>
 Отмена
 </Button>
 <Button variant="destructive"onClick={handleDeleteMenu} disabled={isDeleting}>
 {isDeleting ? 'Удаление...' : 'Удалить'}
 </Button>
 </ModalActions>
 }
 >
 {deleteConfirm ? (
 <>
 <ModalNotice title="Это действие необратимо" tone="danger">
 После удаления меню сотрудники кухни потеряют структуру приёмов пищи, а связанные расчёты потребуется сформировать заново.
 </ModalNotice>

 <ModalSection title="Что будет удалено" description="Проверьте ключевые параметры перед подтверждением.">
 <div className="mezon-modal-facts">
 <div className="mezon-modal-fact">
 <span className="mezon-modal-fact__label">Дата</span>
 <span className="mezon-modal-fact__value">{new Date(deleteConfirm.date).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long'})}</span>
 </div>
 <div className="mezon-modal-fact">
 <span className="mezon-modal-fact__label">Возрастная группа</span>
 <span className="mezon-modal-fact__value">{deleteConfirm.ageGroup}</span>
 </div>
 <div className="mezon-modal-fact">
 <span className="mezon-modal-fact__label">Приёмов пищи</span>
 <span className="mezon-modal-fact__value">{deleteConfirm.meals?.length || 0}</span>
 </div>
 </div>
 </ModalSection>
 </>
 ) : null}
 </Modal>
 </div>
 );
}
