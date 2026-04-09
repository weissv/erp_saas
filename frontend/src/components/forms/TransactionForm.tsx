// src/components/forms/TransactionForm.tsx
import { useState} from 'react';
import { Loader2 } from 'lucide-react';
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
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [formState, setFormState] = useState({
 amount: initialData?.amount.toString() || '',
 type: initialData?.type || 'INCOME',
 category: initialData?.category || 'CLUBS',
 description: initialData?.description || '',
 date: initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
});

 const handleFormSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setIsSubmitting(true);
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
 alert('\u041e\u0448\u0438\u0431\u043a\u0430 \u043f\u0440\u0438 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u0438 \u0442\u0440\u0430\u043d\u0437\u0430\u043a\u0446\u0438\u0438');
} finally {
 setIsSubmitting(false);
}
};

 return (
 <form onSubmit={handleFormSubmit} className="space-y-4">
 <div>
 <label htmlFor="tx-date" className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">\u0414\u0430\u0442\u0430</label>
 <Input
 id="tx-date"
 type="date"
 value={formState.date}
 onChange={(e) => setFormState({ ...formState, date: e.target.value})}
 required
 />
 </div>
 <div>
 <label htmlFor="tx-amount" className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">\u0421\u0443\u043c\u043c\u0430</label>
 <Input
 id="tx-amount"
 type="number"
 placeholder="\u0421\u0443\u043c\u043c\u0430"
 value={formState.amount}
 onChange={(e) => setFormState({ ...formState, amount: e.target.value})}
 required
 />
 </div>
 <div>
 <label htmlFor="tx-type" className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">\u0422\u0438\u043f</label>
 <select
 id="tx-type"
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
 </div>
 <div>
 <label htmlFor="tx-category" className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f</label>
 <select
 id="tx-category"
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
 </div>
 <div>
 <label htmlFor="tx-description" className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435</label>
 <Input
 id="tx-description"
 placeholder="\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435"
 value={formState.description}
 onChange={(e) => setFormState({ ...formState, description: e.target.value})}
 />
 </div>
 <div className="flex justify-end gap-2">
 <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
 \u041e\u0442\u043c\u0435\u043d\u0430
 </Button>
 <Button type="submit" disabled={isSubmitting}>
 {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
 {isSubmitting ? '\u0421\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u0435...' : '\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c'}
 </Button>
 </div>
 </form>
 );
}
