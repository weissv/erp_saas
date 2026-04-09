import { useState} from 'react';
import { toast} from 'sonner';
import { useApi} from '../hooks/useApi';
import { DataTable, Column} from '../components/DataTable/DataTable';
import { Button} from '../components/ui/button';
import { Modal} from '../components/Modal';
import { PlusCircle, ChefHat, Apple, AlertTriangle} from 'lucide-react';
import { Ingredient, Dish, DishNutrition} from '../types/recipe';
import { IngredientForm} from '../components/forms/IngredientForm';
import { DishForm} from '../components/forms/DishForm';
import { api} from '../lib/api';

export default function RecipesPage() {
 const [viewMode, setViewMode] = useState<'ingredients' | 'dishes'>('dishes');

 return (
 <div>
 <div className="flex justify-between items-center mb-4">
 <h1 className="text-[24px] font-bold tracking-[-0.025em] leading-tight flex items-center gap-2">
 <ChefHat className="h-6 w-6"/>
 Рецепты и ингредиенты
 </h1>
 <div className="flex gap-2">
 <Button
 variant={viewMode === 'dishes' ? 'default' : 'outline'}
 onClick={() => setViewMode('dishes')}
 >
 <ChefHat className="mr-2 h-4 w-4"/> Блюда
 </Button>
 <Button
 variant={viewMode === 'ingredients' ? 'default' : 'outline'}
 onClick={() => setViewMode('ingredients')}
 >
 <Apple className="mr-2 h-4 w-4"/> Ингредиенты
 </Button>
 </div>
 </div>

 {viewMode === 'dishes' ? <DishesView /> : <IngredientsView />}
 </div>
 );
}

function DishesView() {
 const { data, total, page, setPage, fetchData} = useApi<Dish>({
 url: '/api/recipes/dishes',
});
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [editingDish, setEditingDish] = useState<Dish | null>(null);
 const [nutritionData, setNutritionData] = useState<DishNutrition | null>(null);
 
 // Delete confirmation modal
 const [deleteModalOpen, setDeleteModalOpen] = useState(false);
 const [deletingDish, setDeletingDish] = useState<Dish | null>(null);
 const [deleting, setDeleting] = useState(false);

 const handleCreate = () => {
 setEditingDish(null);
 setIsModalOpen(true);
};

 const handleEdit = (dish: Dish) => {
 setEditingDish(dish);
 setIsModalOpen(true);
};

 const openDeleteModal = (dish: Dish) => {
 setDeletingDish(dish);
 setDeleteModalOpen(true);
};

 const handleDelete = async () => {
 if (!deletingDish) return;
 setDeleting(true);
 try {
 await api.delete(`/api/recipes/dishes/${deletingDish.id}`);
 toast.success('Блюдо удалено');
 setDeleteModalOpen(false);
 setDeletingDish(null);
 fetchData();
} catch (error: any) {
 toast.error('Ошибка удаления', { description: error?.message});
} finally {
 setDeleting(false);
}
};

 const handleViewNutrition = async (dish: Dish) => {
 try {
 const nutrition = await api.get(`/api/recipes/dishes/${dish.id}/nutrition`);
 setNutritionData(nutrition);
} catch (error) {
 toast.error('Ошибка загрузки КБЖУ');
}
};

 const handleFormSuccess = () => {
 setIsModalOpen(false);
 fetchData();
 toast.success(editingDish ? 'Блюдо обновлено' : 'Блюдо создано');
};

 const columns: Column<Dish>[] = [
 { key: 'id', header: 'ID'},
 { key: 'name', header: 'Название'},
 { key: 'category', header: 'Категория'},
 {
 key: 'preparationTime',
 header: 'Время приготовления',
 render: (row) => `${row.preparationTime} мин`
},
 {
 key: 'ingredients',
 header: 'Ингредиентов',
 render: (row) => row.ingredients?.length || 0
},
 {
 key: 'actions',
 header: 'Действия',
 render: (row) => (
 <div className="flex gap-2">
 <Button variant="outline"size="sm"onClick={() => handleEdit(row)}>
 Редактировать
 </Button>
 <Button variant="ghost"size="sm"onClick={() => handleViewNutrition(row)}>
 КБЖУ
 </Button>
 <Button variant="destructive"size="sm"onClick={() => openDeleteModal(row)}>
 Удалить
 </Button>
 </div>
 ),
},
 ];

 return (
 <>
 <div className="mb-4 flex justify-end">
 <Button onClick={handleCreate}>
 <PlusCircle className="mr-2 h-4 w-4"/> Добавить блюдо
 </Button>
 </div>

 <DataTable
 columns={columns}
 data={data}
 page={page}
 pageSize={10}
 total={total}
 onPageChange={setPage}
 />

 <Modal
 isOpen={isModalOpen}
 onClose={() => setIsModalOpen(false)}
 title={editingDish ? 'Редактировать блюдо' : 'Новое блюдо'}
 >
 <DishForm
 initialData={editingDish}
 onSuccess={handleFormSuccess}
 onCancel={() => setIsModalOpen(false)}
 />
 </Modal>

 <Modal
 isOpen={!!nutritionData}
 onClose={() => setNutritionData(null)}
 title="Пищевая ценность"
 >
 {nutritionData && (
 <div className="space-y-3">
 <h3 className="font-semibold text-lg">{nutritionData.dishName}</h3>
 <div className="grid grid-cols-2 gap-4">
 <div className="p-3 bg-orange-50 rounded-md">
 <div className="text-sm text-secondary">Калорийность</div>
 <div className="text-[24px] font-bold tracking-[-0.025em] leading-tight">{nutritionData.calories.toFixed(1)} ккал</div>
 </div>
 <div className="p-3 bg-tint-blue rounded-md">
 <div className="text-sm text-secondary">Белки</div>
 <div className="text-[24px] font-bold tracking-[-0.025em] leading-tight">{nutritionData.protein.toFixed(1)} г</div>
 </div>
 <div className="p-3 bg-[rgba(255,204,0,0.06)] rounded-md">
 <div className="text-sm text-secondary">Жиры</div>
 <div className="text-[24px] font-bold tracking-[-0.025em] leading-tight">{nutritionData.fat.toFixed(1)} г</div>
 </div>
 <div className="p-3 bg-[rgba(52,199,89,0.06)] rounded-md">
 <div className="text-sm text-secondary">Углеводы</div>
 <div className="text-[24px] font-bold tracking-[-0.025em] leading-tight">{nutritionData.carbs.toFixed(1)} г</div>
 </div>
 </div>
 </div>
 )}
 </Modal>

 {/* Delete confirmation modal */}
 <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Подтверждение удаления">
 <div className="p-4 space-y-4">
 <div className="flex items-start gap-3 p-4 bg-[rgba(255,59,48,0.06)] border border-red-200 rounded-lg">
 <AlertTriangle className="h-6 w-6 text-macos-red flex-shrink-0 mt-0.5"/>
 <div>
 <h4 className="font-semibold text-red-800">Внимание!</h4>
 <p className="text-macos-red text-sm mt-1">
 Вы собираетесь удалить блюдо. Это действие нельзя отменить.
 </p>
 </div>
 </div>
 {deletingDish && (
 <div className="bg-fill-quaternary p-3 rounded-lg">
 <p><strong>Название:</strong> {deletingDish.name}</p>
 <p><strong>Категория:</strong> {deletingDish.category || '—'}</p>
 <p><strong>Ингредиентов:</strong> {deletingDish.ingredients?.length || 0}</p>
 </div>
 )}
 <div className="flex justify-end gap-2 pt-2">
 <Button variant="outline"onClick={() => setDeleteModalOpen(false)} disabled={deleting}>
 Отмена
 </Button>
 <Button variant="destructive"onClick={handleDelete} disabled={deleting}>
 {deleting ? 'Удаление...' : 'Удалить'}
 </Button>
 </div>
 </div>
 </Modal>
 </>
 );
}

function IngredientsView() {
 const { data, total, page, setPage, fetchData} = useApi<Ingredient>({
 url: '/api/recipes/ingredients',
});
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
 
 // Delete confirmation modal
 const [deleteModalOpen, setDeleteModalOpen] = useState(false);
 const [deletingIngredient, setDeletingIngredient] = useState<Ingredient | null>(null);
 const [deleting, setDeleting] = useState(false);

 const handleCreate = () => {
 setEditingIngredient(null);
 setIsModalOpen(true);
};

 const handleEdit = (ingredient: Ingredient) => {
 setEditingIngredient(ingredient);
 setIsModalOpen(true);
};

 const openDeleteModal = (ingredient: Ingredient) => {
 setDeletingIngredient(ingredient);
 setDeleteModalOpen(true);
};

 const handleDelete = async () => {
 if (!deletingIngredient) return;
 setDeleting(true);
 try {
 await api.delete(`/api/recipes/ingredients/${deletingIngredient.id}`);
 toast.success('Ингредиент удален');
 setDeleteModalOpen(false);
 setDeletingIngredient(null);
 fetchData();
} catch (error: any) {
 toast.error('Ошибка удаления', { description: error?.message});
} finally {
 setDeleting(false);
}
};

 const handleFormSuccess = () => {
 setIsModalOpen(false);
 fetchData();
 toast.success(editingIngredient ? 'Ингредиент обновлен' : 'Ингредиент добавлен');
};

 const columns: Column<Ingredient>[] = [
 { key: 'id', header: 'ID'},
 { key: 'name', header: 'Название'},
 { key: 'unit', header: 'Единица'},
 {
 key: 'calories',
 header: 'Калории',
 render: (row) => `${row.calories} ккал`
},
 {
 key: 'protein',
 header: 'Белки',
 render: (row) => `${row.protein} г`
},
 {
 key: 'fat',
 header: 'Жиры',
 render: (row) => `${row.fat} г`
},
 {
 key: 'carbs',
 header: 'Углеводы',
 render: (row) => `${row.carbs} г`
},
 {
 key: 'actions',
 header: 'Действия',
 render: (row) => (
 <div className="flex gap-2">
 <Button variant="outline"size="sm"onClick={() => handleEdit(row)}>
 Редактировать
 </Button>
 <Button variant="destructive"size="sm"onClick={() => openDeleteModal(row)}>
 Удалить
 </Button>
 </div>
 ),
},
 ];

 return (
 <>
 <div className="mb-4 flex justify-end">
 <Button onClick={handleCreate}>
 <PlusCircle className="mr-2 h-4 w-4"/> Добавить ингредиент
 </Button>
 </div>

 <DataTable
 columns={columns}
 data={data}
 page={page}
 pageSize={10}
 total={total}
 onPageChange={setPage}
 />

 <Modal
 isOpen={isModalOpen}
 onClose={() => setIsModalOpen(false)}
 title={editingIngredient ? 'Редактировать ингредиент' : 'Новый ингредиент'}
 >
 <IngredientForm
 initialData={editingIngredient}
 onSuccess={handleFormSuccess}
 onCancel={() => setIsModalOpen(false)}
 />
 </Modal>

 {/* Delete confirmation modal */}
 <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Подтверждение удаления">
 <div className="p-4 space-y-4">
 <div className="flex items-start gap-3 p-4 bg-[rgba(255,59,48,0.06)] border border-red-200 rounded-lg">
 <AlertTriangle className="h-6 w-6 text-macos-red flex-shrink-0 mt-0.5"/>
 <div>
 <h4 className="font-semibold text-red-800">Внимание!</h4>
 <p className="text-macos-red text-sm mt-1">
 Вы собираетесь удалить ингредиент. Это действие нельзя отменить.
 Если ингредиент используется в блюдах, удаление может не сработать.
 </p>
 </div>
 </div>
 {deletingIngredient && (
 <div className="bg-fill-quaternary p-3 rounded-lg">
 <p><strong>Название:</strong> {deletingIngredient.name}</p>
 <p><strong>Единица:</strong> {deletingIngredient.unit}</p>
 <p><strong>Калории:</strong> {deletingIngredient.calories} ккал</p>
 </div>
 )}
 <div className="flex justify-end gap-2 pt-2">
 <Button variant="outline"onClick={() => setDeleteModalOpen(false)} disabled={deleting}>
 Отмена
 </Button>
 <Button variant="destructive"onClick={handleDelete} disabled={deleting}>
 {deleting ? 'Удаление...' : 'Удалить'}
 </Button>
 </div>
 </div>
 </Modal>
 </>
 );
}
