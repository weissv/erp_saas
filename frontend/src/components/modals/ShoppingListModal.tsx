// src/components/modals/ShoppingListModal.tsx
import { useState} from 'react';
import { api} from '../../lib/api';
import { Button} from '../ui/button';
import { Input} from '../ui/input';
import { Modal} from '../Modal';
import { ShoppingListItem} from '../../types/inventory';

interface ShoppingListModalProps {
 onClose: () => void;
 onGenerate: (shoppingList: ShoppingListItem[]) => void;
}

export function ShoppingListModal({ isOpen, onClose, onGenerate}: { isOpen: boolean; onClose: () => void; onGenerate: (shoppingList: ShoppingListItem[]) => void}) {
 const [dates, setDates] = useState({
 startDate: new Date().toISOString().split('T')[0],
 endDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0],
});

 const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 setDates({ ...dates, [e.target.name]: e.target.value});
};

 const handleGenerateShoppingList = async () => {
 try {
 const response = await api.post('/api/inventory/generate-shopping-list', dates);
 onGenerate(response.data.items);
 onClose();
} catch (error: any) {
 alert(`Не удалось сформировать список: ${error.message}`);
 console.error(error);
}
};

 return (
 <Modal isOpen={isOpen} onClose={onClose} title="Список покупок">
 <div className="space-y-4">
 <h2 className="text-[24px] font-bold tracking-[-0.025em] leading-tight mb-4">Выбор периода для списка закупок</h2>
 <div className="grid grid-cols-2 gap-4 mb-4">
 <div>
 <label htmlFor="startDate"className="block mb-1">
 Дата начала
 </label>
 <Input type="date"id="startDate"name="startDate"value={dates.startDate} onChange={handleDateChange} />
 </div>
 <div>
 <label htmlFor="endDate"className="block mb-1">
 Дата окончания
 </label>
 <Input type="date"id="endDate"name="endDate"value={dates.endDate} onChange={handleDateChange} />
 </div>
 </div>
 <div className="flex justify-end gap-2">
 <Button variant="secondary"onClick={onClose}>
 Отмена
 </Button>
 <Button onClick={handleGenerateShoppingList}>Сформировать</Button>
 </div>
 </div>
 </Modal>
 );
}
