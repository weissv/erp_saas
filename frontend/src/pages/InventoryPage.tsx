// src/pages/InventoryPage.tsx
import { useState, useMemo, useEffect} from 'react';
import { toast} from 'sonner';
import { useApi} from '../hooks/useApi';
import { Card} from '../components/Card';
import { Button} from '../components/ui/button';
import { Modal} from '../components/Modal';
import { Input} from '../components/ui/input';
import { ShoppingListModal} from '../components/modals/ShoppingListModal';
import { 
 Item, 
 ShoppingListItem, 
 InventoryType,
 InventoryTransaction,
 InventoryTransactionType,
 inventoryTypeLabels,
 inventoryTypeColors,
 transactionTypeLabels,
 transactionTypeColors,
} from '../types/inventory';
import { api} from '../lib/api';
import { PlusCircle, AlertTriangle, Apple, Package, Archive, Pencil, History, ArrowDownCircle, ArrowUpCircle, Trash2, BarChart3} from 'lucide-react';

type FilterType = 'ALL' | InventoryType;
const selectClassName = 'mezon-field';
const inventoryBadgeColors: Record<InventoryType, string> = {
 FOOD: 'bg-[rgba(52,199,89,0.14)] text-[var(--macos-green)]',
 HOUSEHOLD: 'bg-[rgba(255,149,0,0.14)] text-[var(--macos-orange)]',
 STATIONERY: 'bg-[rgba(191,90,242,0.14)] text-[var(--macos-purple)]',
};

export default function InventoryPage() {
 const { data: items, loading, fetchData} = useApi<Item>({ url: '/api/inventory'});
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [isItemModalOpen, setIsItemModalOpen] = useState(false);
 const [editingItem, setEditingItem] = useState<Item | null>(null);
 const [filterType, setFilterType] = useState<FilterType>('ALL');
 const [formData, setFormData] = useState({
 name: '',
 quantity: '',
 unit: '',
 expiryDate: '',
 type: 'FOOD' as InventoryType,
 minQuantity: '',
});
 const [saving, setSaving] = useState(false);
 const [shoppingList, setShoppingList] = useState<ShoppingListItem[] | null>(null);
 
 // Delete confirmation modal state
 const [deleteModalOpen, setDeleteModalOpen] = useState(false);
 const [deletingItem, setDeletingItem] = useState<Item | null>(null);
 const [deleting, setDeleting] = useState(false);

 // Transaction history modal
 const [transactionsModalOpen, setTransactionsModalOpen] = useState(false);
 const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
 const [transactionsLoading, setTransactionsLoading] = useState(false);
 const [selectedItemForHistory, setSelectedItemForHistory] = useState<Item | null>(null);

 // Write-off modal
 const [writeOffModalOpen, setWriteOffModalOpen] = useState(false);
 const [writeOffItem, setWriteOffItem] = useState<Item | null>(null);
 const [writeOffData, setWriteOffData] = useState({ quantity: '', reason: ''});
 const [writingOff, setWritingOff] = useState(false);

 // Receive (incoming) modal
 const [receiveModalOpen, setReceiveModalOpen] = useState(false);
 const [receiveItem, setReceiveItem] = useState<Item | null>(null);
 const [receiveData, setReceiveData] = useState({ quantity: '', reason: ''});
 const [receiving, setReceiving] = useState(false);

 // All transactions log tab
 const [showAllTransactions, setShowAllTransactions] = useState(false);
 const [allTransactions, setAllTransactions] = useState<InventoryTransaction[]>([]);
 const [allTransactionsLoading, setAllTransactionsLoading] = useState(false);

 // Filter items by type
 const filteredItems = useMemo(() => {
 if (filterType === 'ALL') return items;
 return items.filter((item: any) => item.type === filterType);
}, [items, filterType]);

 // Stats for filter tabs
 const stats = useMemo(() => ({
 all: items.length,
 food: items.filter((item: any) => item.type === 'FOOD').length,
 household: items.filter((item: any) => item.type === 'HOUSEHOLD').length,
 stationery: items.filter((item: any) => item.type === 'STATIONERY').length,
}), [items]);
 const filterCards = [
 {
 type: 'ALL' as const,
 label: 'Все товары',
 count: stats.all,
 icon: Archive,
 accent: 'text-secondary',
 iconBg: 'bg-[rgba(60,60,67,0.08)]',
 ring: 'ring-macos-blue',
},
 {
 type: 'FOOD' as const,
 label: 'Продукты питания',
 count: stats.food,
 icon: Apple,
 accent: 'text-[var(--macos-green)]',
 iconBg: 'bg-[rgba(52,199,89,0.14)]',
 ring: 'ring-[var(--macos-green)]',
},
 {
 type: 'HOUSEHOLD' as const,
 label: 'Хоз. товары',
 count: stats.household,
 icon: Package,
 accent: 'text-[var(--macos-orange)]',
 iconBg: 'bg-[rgba(255,149,0,0.14)]',
 ring: 'ring-[var(--macos-orange)]',
},
 {
 type: 'STATIONERY' as const,
 label: 'Канц. товары',
 count: stats.stationery,
 icon: Pencil,
 accent: 'text-[var(--macos-purple)]',
 iconBg: 'bg-[rgba(191,90,242,0.14)]',
 ring: 'ring-[var(--macos-purple)]',
},
 ];

 const getExpiryClass = (expiryDate?: string) => {
 if (!expiryDate) return '';
 const daysLeft = (new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
 if (daysLeft < 0) return 'bg-[rgba(255,59,48,0.08)]';
 if (daysLeft < 7) return 'bg-[rgba(255,204,0,0.1)]';
 return '';
};

 const handleCreate = () => {
 setEditingItem(null);
 setFormData({ name: '', quantity: '', unit: '', expiryDate: '', type: 'FOOD', minQuantity: ''});
 setIsItemModalOpen(true);
};

 const handleEdit = (item: Item) => {
 setEditingItem(item);
 setFormData({
 name: item.name,
 quantity: String(item.quantity),
 unit: item.unit,
 expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().split('T')[0] : '',
 type: (item as any).type || 'FOOD',
 minQuantity: String((item as any).minQuantity || 0),
});
 setIsItemModalOpen(true);
};

 const openDeleteModal = (item: Item) => {
 setDeletingItem(item);
 setDeleteModalOpen(true);
};

 const handleDelete = async () => {
 if (!deletingItem) return;
 setDeleting(true);
 try {
 await api.delete('/api/inventory/' + deletingItem.id);
 toast.success('Товар удален');
 setDeleteModalOpen(false);
 setDeletingItem(null);
 fetchData();
} catch (error: any) {
 toast.error('Ошибка удаления', { description: error?.message});
} finally {
 setDeleting(false);
}
};

 // Загрузить историю конкретного товара
 const handleShowHistory = async (item: Item) => {
 setSelectedItemForHistory(item);
 setTransactionsLoading(true);
 setTransactionsModalOpen(true);
 try {
 const res = await api.get(`/api/inventory/${item.id}/transactions`);
 const resolved = Array.isArray(res)
 ? res
 : Array.isArray((res as any)?.items)
 ? (res as any).items
 : Array.isArray((res as any)?.data)
 ? (res as any).data
 : [];
 setTransactions(resolved as InventoryTransaction[]);
} catch (error: any) {
 toast.error('Ошибка загрузки истории', { description: error?.message});
} finally {
 setTransactionsLoading(false);
}
};

 // Загрузить все транзакции
 const handleShowAllTransactions = async () => {
 setShowAllTransactions(true);
 setAllTransactionsLoading(true);
 try {
 const res = await api.get('/api/inventory/transactions?limit=200');
 const resolved = Array.isArray(res)
 ? res
 : Array.isArray((res as any)?.items)
 ? (res as any).items
 : Array.isArray((res as any)?.data)
 ? (res as any).data
 : [];
 setAllTransactions(resolved as InventoryTransaction[]);
} catch (error: any) {
 toast.error('Ошибка загрузки журнала', { description: error?.message});
} finally {
 setAllTransactionsLoading(false);
}
};

 // Списание
 const handleWriteOff = async () => {
 if (!writeOffItem) return;
 setWritingOff(true);
 try {
 await api.post(`/api/inventory/${writeOffItem.id}/write-off`, {
 quantity: parseFloat(writeOffData.quantity),
 reason: writeOffData.reason || 'Списание',
});
 toast.success('Товар списан');
 setWriteOffModalOpen(false);
 setWriteOffItem(null);
 setWriteOffData({ quantity: '', reason: ''});
 fetchData();
} catch (error: any) {
 toast.error('Ошибка списания', { description: error?.response?.data?.message || error?.message});
} finally {
 setWritingOff(false);
}
};

 // Приёмка
 const handleReceive = async () => {
 if (!receiveItem) return;
 setReceiving(true);
 try {
 await api.post(`/api/inventory/${receiveItem.id}/receive`, {
 quantity: parseFloat(receiveData.quantity),
 reason: receiveData.reason || 'Приёмка товара',
});
 toast.success('Товар принят');
 setReceiveModalOpen(false);
 setReceiveItem(null);
 setReceiveData({ quantity: '', reason: ''});
 fetchData();
} catch (error: any) {
 toast.error('Ошибка приёмки', { description: error?.response?.data?.message || error?.message});
} finally {
 setReceiving(false);
}
};

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setSaving(true);
 try {
 const payload = {
 name: formData.name,
 quantity: parseFloat(formData.quantity),
 unit: formData.unit,
 expiryDate: formData.expiryDate || null,
 type: formData.type,
 minQuantity: formData.minQuantity ? parseFloat(formData.minQuantity) : 0,
};

 if (editingItem) {
 await api.put('/api/inventory/' + editingItem.id, payload);
 toast.success('Товар обновлен');
} else {
 await api.post('/api/inventory', payload);
 toast.success('Товар добавлен');
}
 setIsItemModalOpen(false);
 fetchData();
} catch (error: any) {
 toast.error('Ошибка сохранения', { description: error?.message});
} finally {
 setSaving(false);
}
};

 return (
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <div className="flex items-center gap-3">
 <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[rgba(10,132,255,0.12)] text-macos-blue shadow-[0_10px_24px_rgba(10,132,255,0.12)]">
 <Archive className="h-5 w-5"/>
 </div>
 <div>
 <div className="mezon-badge mb-2">Inventory · склад</div>
 <h1 className="mezon-section-title mb-1">Складской учёт</h1>
 <p className="mezon-subtitle">Остатки, движения и закупки по продуктам, хозяйственным и канцелярским товарам.</p>
 </div>
 </div>
 <div className="flex gap-2">
 <Button onClick={handleCreate}>
 <PlusCircle className="mr-2 h-4 w-4"/> Добавить товар
 </Button>
 <Button variant="outline"onClick={handleShowAllTransactions}>
 <History className="mr-2 h-4 w-4"/> Журнал движений
 </Button>
 <Button onClick={() => setIsModalOpen(true)}>Сформировать список закупок</Button>
 </div>
 </div>

 {/* Filter tabs */}
 <div className="grid grid-cols-4 gap-4">
 {filterCards.map(({ type, label, count, icon: Icon, accent, iconBg, ring}) => (
 <Card
 key={type}
 className={`p-0 macos-transition ${filterType === type ? `ring-2 ${ring}`: 'hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]'}`}
 >
 <button
 type="button"
 className="flex w-full items-center gap-3 p-4 text-left"
 onClick={() => setFilterType(type)}
 >
 <div className={`rounded-xl p-2 ${iconBg}`}>
 <Icon className={`h-5 w-5 ${accent}`} />
 </div>
 <div>
 <span className="text-sm text-secondary">{label}</span>
 <p className={`mt-1 text-[24px] font-bold tracking-[-0.025em] leading-tight ${type === 'ALL' ? 'text-primary' : accent}`}>{count}</p>
 </div>
 </button>
 </Card>
 ))}
 </div>

 <Card>
 <h2 className="flex items-center gap-2 p-4 text-xl font-semibold text-primary">
 {filterType === 'FOOD' && <Apple className="h-5 w-5 text-[var(--macos-green)]"/>}
 {filterType === 'HOUSEHOLD' && <Package className="h-5 w-5 text-[var(--macos-orange)]"/>}
 {filterType === 'STATIONERY' && <Pencil className="h-5 w-5 text-[var(--macos-purple)]"/>}
 {filterType === 'ALL' ? 'Все остатки' : inventoryTypeLabels[filterType]}
 </h2>
 {loading ? (
 <div className="p-4">Загрузка...</div>
 ) : filteredItems.length === 0 ? (
 <div className="p-8 text-center text-secondary">
 {filterType === 'ALL' ? 'Нет товаров на складе' : `Нет товаров в категории"${inventoryTypeLabels[filterType]}"`}
 </div>
 ) : (
 <table className="w-full text-sm">
 <thead className="bg-[rgba(255,255,255,0.6)] text-secondary">
 <tr>
 <th className="text-left p-2">Наименование</th>
 <th className="text-left p-2">Тип</th>
 <th className="text-left p-2">Количество</th>
 <th className="text-left p-2">Срок годности</th>
 <th className="text-left p-2">Действия</th>
 </tr>
 </thead>
 <tbody>
 {filteredItems.map((item: any) => (
 <tr key={item.id} className={'border-t ' + getExpiryClass(item.expiryDate)}>
 <td className="p-2">{item.name}</td>
 <td className="p-2">
 <span className={`px-2 py-0.5 rounded text-xs ${
 inventoryBadgeColors[item.type as InventoryType]
}`}>
 {inventoryTypeLabels[item.type as InventoryType] || item.type}
 </span>
 </td>
 <td className="p-2">
 {item.quantity} {item.unit}
 </td>
 <td className="p-2">{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '—'}</td>
 <td className="p-2">
 <div className="flex gap-1 flex-wrap">
 <Button variant="outline"size="sm"onClick={() => handleEdit(item)} title="Редактировать">
 <Pencil className="h-3 w-3"/>
 </Button>
 <Button variant="outline"size="sm"onClick={() => { setReceiveItem(item); setReceiveData({ quantity: '', reason: ''}); setReceiveModalOpen(true);}} title="Приёмка">
 <ArrowDownCircle className="h-3 w-3 text-[var(--macos-green)]"/>
 </Button>
 <Button variant="outline"size="sm"onClick={() => { setWriteOffItem(item); setWriteOffData({ quantity: '', reason: ''}); setWriteOffModalOpen(true);}} title="Списание">
 <Trash2 className="h-3 w-3 text-[var(--macos-red)]"/>
 </Button>
 <Button variant="outline"size="sm"onClick={() => handleShowHistory(item)} title="История движений">
 <History className="h-3 w-3 text-macos-blue"/>
 </Button>
 <Button variant="destructive"size="sm"onClick={() => openDeleteModal(item)} title="Удалить">
 &times;
 </Button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 )}
 </Card>

 {shoppingList && (
 <Card className="mt-6">
 <h2 className="p-4 text-xl font-semibold text-primary">Список закупок</h2>
 <table className="w-full text-sm">
 <thead className="bg-[rgba(255,255,255,0.6)] text-secondary">
 <tr>
 <th className="text-left p-2">Продукт</th>
 <th className="text-left p-2">Требуется</th>
 <th className="text-left p-2">На складе</th>
 <th className="text-left p-2">Нужно закупить</th>
 </tr>
 </thead>
 <tbody>
 {shoppingList
 .filter((item) => item.toBuy > 0)
 .map((item, index) => (
 <tr key={index} className="border-t">
 <td className="p-2">{item.name}</td>
 <td className="p-2">
 {item.requiredQty.toFixed(2)} {item.unit}
 </td>
 <td className="p-2">
 {item.inStock.toFixed(2)} {item.unit}
 </td>
 <td className="p-2 font-bold">
 {item.toBuy.toFixed(2)} {item.unit}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </Card>
 )}

 {isModalOpen && <ShoppingListModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onGenerate={setShoppingList} />}

 <Modal
 isOpen={isItemModalOpen}
 onClose={() => setIsItemModalOpen(false)}
 title={editingItem ? 'Редактировать товар' : 'Новый товар'}
 >
 <form onSubmit={handleSubmit} className="space-y-4 p-4">
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest mb-1">Наименование *</label>
 <Input
 value={formData.name}
 onChange={(e) => setFormData({ ...formData, name: e.target.value})}
 required
 placeholder="Молоко"
 />
 </div>

 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest mb-1">Тип товара *</label>
 <select
 value={formData.type}
 onChange={(e) => setFormData({ ...formData, type: e.target.value as InventoryType})}
 className={selectClassName}
 required
 >
 <option value="FOOD">Продукты питания</option>
 <option value="HOUSEHOLD">Хоз. товары</option>
 <option value="STATIONERY">Канц. товары</option>
 </select>
 </div>

 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest mb-1">Количество *</label>
 <Input
 type="number"
 value={formData.quantity}
 onChange={(e) => setFormData({ ...formData, quantity: e.target.value})}
 required
 placeholder="10"
 step="0.01"
 />
 </div>

 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest mb-1">Единица измерения *</label>
 <Input
 value={formData.unit}
 onChange={(e) => setFormData({ ...formData, unit: e.target.value})}
 required
 placeholder="л"
 />
 </div>

 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest mb-1">Срок годности</label>
 <Input
 type="date"
 value={formData.expiryDate}
 onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value})}
 />
 {formData.type !== 'FOOD' && (
 <p className="mt-1 text-xs text-secondary">Для хозяйственных и канцелярских товаров срок годности обычно не указывается</p>
 )}
 </div>

 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest mb-1">Мин. остаток (для уведомлений)</label>
 <Input
 type="number"
 value={formData.minQuantity}
 onChange={(e) => setFormData({ ...formData, minQuantity: e.target.value})}
 placeholder="0"
 step="0.01"
 />
 <p className="mt-1 text-xs text-secondary">При снижении остатка ниже этого значения товар будет выделяться</p>
 </div>

 <div className="flex gap-2 justify-end pt-4">
 <Button
 type="button"
 variant="ghost"
 onClick={() => setIsItemModalOpen(false)}
 disabled={saving}
 >
 Отмена
 </Button>
 <Button type="submit"disabled={saving}>
 {saving ? 'Сохранение...' : 'Сохранить'}
 </Button>
 </div>
 </form>
 </Modal>

 {/* Delete confirmation modal */}
 <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Подтверждение удаления">
 <div className="p-4 space-y-4">
 <div className="flex items-start gap-3 rounded-lg border border-[rgba(255,59,48,0.18)] bg-[rgba(255,59,48,0.08)] p-4">
 <AlertTriangle className="mt-0.5 h-6 w-6 flex-shrink-0 text-[var(--macos-red)]"/>
 <div>
 <h4 className="font-semibold text-[var(--macos-red)]">Внимание!</h4>
 <p className="mt-1 text-sm text-[var(--macos-red)]">
 Вы собираетесь удалить товар со склада. Это действие нельзя отменить.
 </p>
 </div>
 </div>
 {deletingItem && (
 <div className="rounded-lg bg-[rgba(255,255,255,0.58)] p-3">
 <p><strong>Наименование:</strong> {deletingItem.name}</p>
 <p><strong>Количество:</strong> {deletingItem.quantity} {deletingItem.unit}</p>
 {deletingItem.expiryDate && (
 <p><strong>Срок годности:</strong> {new Date(deletingItem.expiryDate).toLocaleDateString()}</p>
 )}
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

 {/* Transaction history modal for specific item */}
 <Modal isOpen={transactionsModalOpen} onClose={() => setTransactionsModalOpen(false)} title={`История движений: ${selectedItemForHistory?.name || ''}`}>
 <div className="p-4">
 {transactionsLoading ? (
 <div className="text-center py-4">Загрузка...</div>
 ) : transactions.length === 0 ? (
 <div className="py-4 text-center text-secondary">Нет записей о движениях</div>
 ) : (
 <div className="max-h-[60vh] overflow-y-auto">
 <table className="w-full text-sm">
 <thead className="sticky top-0 bg-[rgba(255,255,255,0.72)] text-secondary">
 <tr>
 <th className="text-left p-2">Дата</th>
 <th className="text-left p-2">Тип</th>
 <th className="text-left p-2">Кол-во</th>
 <th className="text-left p-2">До → После</th>
 <th className="text-left p-2">Причина</th>
 </tr>
 </thead>
 <tbody>
 {transactions.map((tx: InventoryTransaction) => (
 <tr key={tx.id} className="border-t">
 <td className="p-2 whitespace-nowrap">{new Date(tx.createdAt).toLocaleString('ru')}</td>
 <td className="p-2">
 <span className={`px-2 py-0.5 rounded text-xs ${transactionTypeColors[tx.type]}`}>
 {transactionTypeLabels[tx.type]}
 </span>
 </td>
 <td className="p-2 font-mono">
 <span className={tx.type === 'IN' ? 'text-[var(--macos-green)]' : 'text-[var(--macos-red)]'}>
 {tx.type === 'IN' ? '+' : '-'}{tx.quantity}
 </span>
 </td>
 <td className="p-2 font-mono text-xs">{tx.quantityBefore} → {tx.quantityAfter}</td>
 <td className="p-2 text-xs max-w-[200px] truncate"title={tx.reason || ''}>
 {tx.reason || '—'}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>
 </Modal>

 {/* Write-off modal */}
 <Modal isOpen={writeOffModalOpen} onClose={() => setWriteOffModalOpen(false)} title="Списание товара">
 <div className="p-4 space-y-4">
 {writeOffItem && (
 <div className="rounded-lg border border-[rgba(255,149,0,0.18)] bg-[rgba(255,149,0,0.1)] p-3">
 <p className="font-medium">{writeOffItem.name}</p>
 <p className="text-sm text-secondary">На складе: <strong>{writeOffItem.quantity} {writeOffItem.unit}</strong></p>
 </div>
 )}
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest mb-1">Количество для списания *</label>
 <Input
 type="number"
 value={writeOffData.quantity}
 onChange={(e) => setWriteOffData({ ...writeOffData, quantity: e.target.value})}
 placeholder="0"
 step="0.01"
 max={writeOffItem?.quantity}
 />
 </div>
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest mb-1">Причина списания</label>
 <Input
 value={writeOffData.reason}
 onChange={(e) => setWriteOffData({ ...writeOffData, reason: e.target.value})}
 placeholder="Просрочка, порча, и т.п."
 />
 </div>
 <div className="flex justify-end gap-2 pt-2">
 <Button variant="outline"onClick={() => setWriteOffModalOpen(false)} disabled={writingOff}>Отмена</Button>
 <Button variant="destructive"onClick={handleWriteOff} disabled={writingOff || !writeOffData.quantity}>
 {writingOff ? 'Списание...' : 'Списать'}
 </Button>
 </div>
 </div>
 </Modal>

 {/* Receive (incoming) modal */}
 <Modal isOpen={receiveModalOpen} onClose={() => setReceiveModalOpen(false)} title="Приёмка товара">
 <div className="p-4 space-y-4">
 {receiveItem && (
 <div className="rounded-lg border border-[rgba(52,199,89,0.18)] bg-[rgba(52,199,89,0.1)] p-3">
 <p className="font-medium">{receiveItem.name}</p>
 <p className="text-sm text-secondary">Текущий остаток: <strong>{receiveItem.quantity} {receiveItem.unit}</strong></p>
 </div>
 )}
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest mb-1">Количество прихода *</label>
 <Input
 type="number"
 value={receiveData.quantity}
 onChange={(e) => setReceiveData({ ...receiveData, quantity: e.target.value})}
 placeholder="0"
 step="0.01"
 />
 </div>
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest mb-1">Комментарий</label>
 <Input
 value={receiveData.reason}
 onChange={(e) => setReceiveData({ ...receiveData, reason: e.target.value})}
 placeholder="Закупка, поставка и т.п."
 />
 </div>
 <div className="flex justify-end gap-2 pt-2">
 <Button variant="outline"onClick={() => setReceiveModalOpen(false)} disabled={receiving}>Отмена</Button>
 <Button onClick={handleReceive} disabled={receiving || !receiveData.quantity}>
 {receiving ? 'Приёмка...' : 'Принять'}
 </Button>
 </div>
 </div>
 </Modal>

 {/* All transactions log modal */}
 <Modal isOpen={showAllTransactions} onClose={() => setShowAllTransactions(false)} title="Журнал движений склада">
 <div className="p-4">
 {allTransactionsLoading ? (
 <div className="text-center py-4">Загрузка...</div>
 ) : allTransactions.length === 0 ? (
 <div className="py-4 text-center text-secondary">Нет записей о движениях</div>
 ) : (
 <div className="max-h-[70vh] overflow-y-auto">
 <table className="w-full text-sm">
 <thead className="sticky top-0 bg-[rgba(255,255,255,0.72)] text-secondary">
 <tr>
 <th className="text-left p-2">Дата</th>
 <th className="text-left p-2">Товар</th>
 <th className="text-left p-2">Тип</th>
 <th className="text-left p-2">Кол-во</th>
 <th className="text-left p-2">До → После</th>
 <th className="text-left p-2">Причина</th>
 <th className="text-left p-2">Заявка</th>
 <th className="text-left p-2">Кто</th>
 </tr>
 </thead>
 <tbody>
 {allTransactions.map((tx: InventoryTransaction) => (
 <tr key={tx.id} className="border-t hover:bg-[rgba(255,255,255,0.5)]">
 <td className="p-2 whitespace-nowrap text-xs">{new Date(tx.createdAt).toLocaleString('ru')}</td>
 <td className="p-2 font-medium">{tx.inventoryItem?.name || '—'}</td>
 <td className="p-2">
 <span className={`px-2 py-0.5 rounded text-xs ${transactionTypeColors[tx.type]}`}>
 {transactionTypeLabels[tx.type]}
 </span>
 </td>
 <td className="p-2 font-mono">
 <span className={tx.type === 'IN' ? 'text-[var(--macos-green)]' : 'text-[var(--macos-red)]'}>
 {tx.type === 'IN' ? '+' : '-'}{tx.quantity}
 </span>
 </td>
 <td className="p-2 font-mono text-xs">{tx.quantityBefore} → {tx.quantityAfter}</td>
 <td className="p-2 text-xs max-w-[150px] truncate"title={tx.reason || ''}>{tx.reason || '—'}</td>
 <td className="p-2 text-xs">
 {tx.maintenanceRequest ? `#${tx.maintenanceRequest.id} ${tx.maintenanceRequest.title}`: '—'}
 </td>
 <td className="p-2 text-xs">
 {tx.performedBy ? `${tx.performedBy.firstName} ${tx.performedBy.lastName}`: '—'}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>
 </Modal>
 </div>
 );
}
