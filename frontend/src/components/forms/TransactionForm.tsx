// src/components/forms/TransactionForm.tsx
import { useState} from 'react';
import { api} from '../../lib/api';
import { Button} from '../ui/button';
import { Input} from '../ui/input';
import { FINANCE_TYPES, FINANCE_CATEGORIES} from '../../lib/constants';
import { Transaction} from '../../types/finance';

interface TransactionFormProps {
 onSuccess: () => void;
 onCancel: () => void;
 initialData?: Transaction | null;
}

export function TransactionForm({ onSuccess, onCancel, initialData}: TransactionFormProps) {
 const [formState, setFormState] = useState({
 amount: initialData?.amount.toString() || '',
 type: initialData?.type || 'INCOME',
 category: initialData?.category || 'CLUBS',
 description: initialData?.description || '',
 date: initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
});

 const handleFormSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 try {
 const data = { ...formState, amount: parseFloat(formState.amount)};
 if (initialData) {
 await api.put(`/api/finance/transactions/${initialData.id}`, data);
} else {
 await api.post('/api/finance/transactions', data);
}
 onSuccess();
} catch (error) {
 console.error('Failed to save transaction', error);
 alert('Ошибка при сохранении транзакции');
}
};

 return (
 <form onSubmit={handleFormSubmit} className="space-y-4">
 <Input
 type="date"
 value={formState.date}
 onChange={(e) => setFormState({ ...formState, date: e.target.value})}
 required
 />
 <Input
 type="number"
 placeholder="Сумма"
 value={formState.amount}
 onChange={(e) => setFormState({ ...formState, amount: e.target.value})}
 required
 />
 <select
 value={formState.type}
 onChange={(e) => setFormState({ ...formState, type: e.target.value})}
 className="w-full p-2 border rounded"
 >
 {Object.entries(FINANCE_TYPES).map(([key, value]) => (
 <option key={key} value={key}>
 {value}
 </option>
 ))}
 </select>
 <select
 value={formState.category}
 onChange={(e) => setFormState({ ...formState, category: e.target.value})}
 className="w-full p-2 border rounded"
 >
 {Object.entries(FINANCE_CATEGORIES).map(([key, value]) => (
 <option key={key} value={key}>
 {value}
 </option>
 ))}
 </select>
 <Input
 placeholder="Описание"
 value={formState.description}
 onChange={(e) => setFormState({ ...formState, description: e.target.value})}
 />
 <div className="flex justify-end gap-2">
 <Button type="button"variant="secondary"onClick={onCancel}>
 Отмена
 </Button>
 <Button type="submit">Сохранить</Button>
 </div>
 </form>
 );
}
