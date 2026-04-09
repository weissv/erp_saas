// src/pages/ProcurementPage.tsx
import { useState, useEffect, useCallback} from 'react';
import { toast} from 'sonner';
import { Button} from '../components/ui/button';
import { Input} from '../components/ui/input';
import { Modal} from '../components/Modal';
import { 
 ShoppingCart, Users, PlusCircle, AlertTriangle, Search, 
 Package, Check, X, Truck, ClipboardCheck, ArrowRight,
 BarChart3, Edit, Trash2, Eye, Send, Ban, RefreshCw,
 TrendingUp, Clock, DollarSign, Archive, Link2, AlertCircle,
 FileText
} from 'lucide-react';
import { 
 PurchaseOrder, Supplier, PurchaseOrderStatus,
 purchaseOrderStatusLabels, purchaseOrderStatusColors,
 purchaseOrderTypeLabels, purchaseOrderTypeColors,
 priorityLabels, priorityColors,
} from '../types/procurement';
import type { Invoice} from '../types/finance';
import { PurchaseOrderForm} from '../components/forms/PurchaseOrderForm';
import { SupplierForm} from '../components/forms/SupplierForm';
import { useOneCProcurementInvoices} from '../features/onec';
import { api} from '../lib/api';
import { useAuth} from '../hooks/useAuth';

const currency = new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS', maximumFractionDigits: 0});

export default function ProcurementPage() {
 const [viewMode, setViewMode] = useState<'orders' | 'suppliers' | 'invoices'>('orders');

 return (
 <div className="space-y-4">
 {/* Header */}
 <div className="flex justify-between items-center">
 <div>
 <h1 className="text-[24px] font-bold tracking-[-0.025em] leading-tight flex items-center gap-2 text-gray-800">
 <ShoppingCart className="h-6 w-6 text-macos-blue"/>
 Закупки
 </h1>
 <p className="text-sm text-secondary mt-0.5">Управление заказами, поставщиками и накладными</p>
 </div>
 <div className="flex gap-1 bg-fill-tertiary p-1 rounded-lg">
 <button
 onClick={() => setViewMode('orders')}
 className={`flex items-center gap-2 px-4 py-2 rounded-md text-[11px] font-medium uppercase tracking-widest macos-transition ${
 viewMode === 'orders'
 ? 'bg-white text-macos-blue shadow-sm'
 : 'text-secondary hover:text-gray-800'
}`}
 >
 <Package className="h-4 w-4"/>
 Заказы
 </button>
 <button
 onClick={() => setViewMode('suppliers')}
 className={`flex items-center gap-2 px-4 py-2 rounded-md text-[11px] font-medium uppercase tracking-widest macos-transition ${
 viewMode === 'suppliers'
 ? 'bg-white text-macos-blue shadow-sm'
 : 'text-secondary hover:text-gray-800'
}`}
 >
 <Users className="h-4 w-4"/>
 Поставщики
 </button>
 <button
 onClick={() => setViewMode('invoices')}
 className={`flex items-center gap-2 px-4 py-2 rounded-md text-[11px] font-medium uppercase tracking-widest macos-transition ${
 viewMode === 'invoices'
 ? 'bg-white text-macos-blue shadow-sm'
 : 'text-secondary hover:text-gray-800'
}`}
 >
 <FileText className="h-4 w-4"/>
 Накладные 1С
 </button>
 </div>
 </div>

 {viewMode === 'orders' && <OrdersView />}
 {viewMode === 'suppliers' && <SuppliersView />}
 {viewMode === 'invoices' && <IncomingInvoicesView />}
 </div>
 );
}

// =====================================================
// Накладные от поставщиков (из 1С)
// =====================================================
function IncomingInvoicesView() {
 const { items: invoices, total, page, setPage, loading, totalPages} = useOneCProcurementInvoices(20);

 return (
 <div className="space-y-4">
 <div className="bg-tint-blue border border-blue-200 rounded-lg p-3 text-sm text-macos-blue">
 <FileText className="inline h-4 w-4 mr-1"/>
 Поступления от поставщиков, импортированные из 1С. Только для просмотра.
 </div>

 {loading ? (
 <div className="p-4 text-center text-secondary">Загрузка...</div>
 ) : invoices.length === 0 ? (
 <div className="p-8 text-center text-secondary">Накладные не найдены</div>
 ) : (
 <>
 <div className="overflow-x-auto">
 <table className="w-full text-sm border-collapse">
 <thead>
 <tr className="bg-fill-quaternary text-left">
 <th className="p-3 font-medium">Дата</th>
 <th className="p-3 font-medium">№ документа</th>
 <th className="p-3 font-medium">Контрагент</th>
 <th className="p-3 font-medium">Сумма</th>
 <th className="p-3 font-medium">Проведён</th>
 <th className="p-3 font-medium">Комментарий</th>
 </tr>
 </thead>
 <tbody>
 {invoices.map(inv => (
 <tr key={inv.id} className="border-b hover:bg-fill-quaternary">
 <td className="p-3">{new Date(inv.date).toLocaleDateString()}</td>
 <td className="p-3 font-mono text-xs">{inv.documentNumber || '—'}</td>
 <td className="p-3">{inv.contractor?.name || '—'}</td>
 <td className="p-3 font-medium">{currency.format(Number(inv.totalAmount))}</td>
 <td className="p-3">{inv.posted ? <Check className="h-4 w-4 text-macos-green"/> : '—'}</td>
 <td className="p-3 text-secondary truncate max-w-[200px]">{inv.comment || '—'}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 {totalPages > 1 && (
 <div className="flex justify-center gap-2 mt-4">
 <Button variant="outline"size="sm"disabled={page <= 1} onClick={() => setPage(page - 1)}>
 ← Назад
 </Button>
 <span className="py-2 px-3 text-sm text-secondary">{page} / {totalPages}</span>
 <Button variant="outline"size="sm"disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
 Вперёд →
 </Button>
 </div>
 )}
 </>
 )}
 </div>
 );
}

// =====================================================
// Заказы
// =====================================================
function OrdersView() {
 const { user} = useAuth();
 const userRole = user?.role || 'TEACHER';
 const canApprove = ['DEVELOPER', 'DIRECTOR', 'DEPUTY'].includes(userRole);
 const canCreate = ['DEVELOPER', 'DIRECTOR', 'DEPUTY', 'ADMIN', 'ZAVHOZ'].includes(userRole);
 const canReceive = ['DEVELOPER', 'DIRECTOR', 'ADMIN', 'ZAVHOZ'].includes(userRole);

 const [orders, setOrders] = useState<PurchaseOrder[]>([]);
 const [loading, setLoading] = useState(true);
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
 const [viewOrder, setViewOrder] = useState<PurchaseOrder | null>(null);

 // Статистика
 const [stats, setStats] = useState<{ total: number; byStatus: Record<string, number>; totalSpent: number} | null>(null);

 // Фильтры
 const [filterStatus, setFilterStatus] = useState<string>('');
 const [filterType, setFilterType] = useState<string>('');
 const [searchQuery, setSearchQuery] = useState('');

 // Модалы действий
 const [rejectModalOpen, setRejectModalOpen] = useState(false);
 const [rejectReason, setRejectReason] = useState('');
 const [actionOrder, setActionOrder] = useState<PurchaseOrder | null>(null);
 const [actionLoading, setActionLoading] = useState(false);

 // Модал удаления
 const [deleteModalOpen, setDeleteModalOpen] = useState(false);
 const [deletingOrder, setDeletingOrder] = useState<PurchaseOrder | null>(null);
 const [deleting, setDeleting] = useState(false);

 // Модал приёмки
 const [receiveModalOpen, setReceiveModalOpen] = useState(false);
 const [receiveOrder, setReceiveOrderState] = useState<PurchaseOrder | null>(null);
 const [receiveNote, setReceiveNote] = useState('');

 const currency = new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS', maximumFractionDigits: 0});

 const fetchOrders = useCallback(async () => {
 setLoading(true);
 try {
 const params = new URLSearchParams();
 if (filterStatus) params.set('status', filterStatus);
 if (filterType) params.set('type', filterType);
 if (searchQuery) params.set('search', searchQuery);
 const data = await api.get(`/api/procurement/orders?${params.toString()}`);
 setOrders(Array.isArray(data) ? data : []);
} catch (error: any) {
 toast.error('Ошибка загрузки заказов');
} finally {
 setLoading(false);
}
}, [filterStatus, filterType, searchQuery]);

 const fetchStats = useCallback(async () => {
 try {
 const data = await api.get('/api/procurement/orders/stats');
 setStats(data);
} catch { /* stats are optional */}
}, []);

 useEffect(() => { fetchOrders(); fetchStats();}, [fetchOrders, fetchStats]);

 const handleCreate = (type: 'PLANNED' | 'OPERATIONAL') => {
 setEditingOrder({ type} as any);
 setIsModalOpen(true);
};

 const handleFormSuccess = () => {
 setIsModalOpen(false);
 setEditingOrder(null);
 fetchOrders();
 fetchStats();
};

 // Workflow actions
 const performAction = async (orderId: number, action: string, body?: any) => {
 setActionLoading(true);
 try {
 await api.post(`/api/procurement/orders/${orderId}/${action}`, body || {});
 toast.success('Действие выполнено');
 fetchOrders();
 fetchStats();
 setRejectModalOpen(false);
 setRejectReason('');
 setActionOrder(null);
} catch (error: any) {
 toast.error(error?.message || 'Ошибка');
} finally {
 setActionLoading(false);
}
};

 const handleReceiveSubmit = async () => {
 if (!receiveOrder) return;
 setActionLoading(true);
 try {
 const result = await api.post(`/api/procurement/orders/${receiveOrder.id}/receive`, {
 receiveNote,
});
 toast.success('Товар принят на склад!');
 if (result?.warnings?.length > 0) {
 result.warnings.forEach((w: string) => toast.warning(w, { duration: 5000}));
}
 if (result?.receivedItems?.length > 0) {
 const summary = result.receivedItems.map((i: any) => `${i.itemName}: +${i.received}`).join(', ');
 toast.info(`Добавлено на склад: ${summary}`, { duration: 5000});
}
 setReceiveModalOpen(false);
 setReceiveOrderState(null);
 setReceiveNote('');
 fetchOrders();
 fetchStats();
} catch (error: any) {
 toast.error(error?.message || 'Ошибка приёмки');
} finally {
 setActionLoading(false);
}
};

 const handleDelete = async () => {
 if (!deletingOrder) return;
 setDeleting(true);
 try {
 await api.delete(`/api/procurement/orders/${deletingOrder.id}`);
 toast.success('Заказ удалён');
 setDeleteModalOpen(false);
 setDeletingOrder(null);
 fetchOrders();
 fetchStats();
} catch (error: any) {
 toast.error(error?.message || 'Ошибка удаления');
} finally {
 setDeleting(false);
}
};

 const getStatusBadge = (status: PurchaseOrderStatus) => (
 <span className={`px-2 py-1 rounded-full text-xs font-medium ${purchaseOrderStatusColors[status] || 'bg-fill-tertiary'}`}>
 {purchaseOrderStatusLabels[status] || status}
 </span>
 );

 // Кнопки действий для каждого заказа
 const renderActions = (order: PurchaseOrder) => {
 const actions: JSX.Element[] = [];

 // Просмотр — всем
 actions.push(
 <Button key="view"variant="outline"size="sm"onClick={() => setViewOrder(order)}>
 <Eye className="h-4 w-4"/>
 </Button>
 );

 // DRAFT -> Отправить на одобрение
 if (order.status === 'DRAFT' && canCreate) {
 actions.push(
 <Button key="submit"variant="outline"size="sm"className="text-macos-blue"onClick={() => performAction(order.id, 'submit')}>
 <Send className="h-4 w-4 mr-1"/> На одобрение
 </Button>
 );
}

 // PENDING -> Одобрить / Отклонить (только DIRECTOR/DEPUTY)
 if (order.status === 'PENDING' && canApprove) {
 actions.push(
 <Button key="approve"variant="outline"size="sm"className="text-macos-green"onClick={() => performAction(order.id, 'approve')}>
 <Check className="h-4 w-4 mr-1"/> Одобрить
 </Button>
 );
 actions.push(
 <Button key="reject"variant="outline"size="sm"className="text-macos-red"onClick={() => { setActionOrder(order); setRejectModalOpen(true);}}>
 <X className="h-4 w-4 mr-1"/> Отклонить
 </Button>
 );
}

 // APPROVED -> Заказано
 if (order.status === 'APPROVED' && canCreate) {
 actions.push(
 <Button key="order"variant="outline"size="sm"className="text-macos-blue"onClick={() => performAction(order.id, 'order')}>
 <Truck className="h-4 w-4 mr-1"/> Заказано
 </Button>
 );
}

 // ORDERED -> Доставлено
 if ((order.status === 'ORDERED' || order.status === 'PARTIALLY_DELIVERED') && canCreate) {
 actions.push(
 <Button key="deliver"variant="outline"size="sm"className="text-indigo-600"onClick={() => performAction(order.id, 'deliver')}>
 <Package className="h-4 w-4 mr-1"/> Доставлено
 </Button>
 );
}

 // DELIVERED/ORDERED/PARTIALLY_DELIVERED -> Принять на склад
 if (['DELIVERED', 'ORDERED', 'PARTIALLY_DELIVERED'].includes(order.status) && canReceive) {
 actions.push(
 <Button key="receive"variant="outline"size="sm"className="text-emerald-600"onClick={() => { setReceiveOrderState(order); setReceiveModalOpen(true);}}>
 <ClipboardCheck className="h-4 w-4 mr-1"/> Принять
 </Button>
 );
}

 // Редактировать (DRAFT, REJECTED)
 if ((order.status === 'DRAFT' || order.status === 'REJECTED') && canCreate) {
 actions.push(
 <Button key="edit"variant="outline"size="sm"onClick={() => { setEditingOrder(order); setIsModalOpen(true);}}>
 <Edit className="h-4 w-4"/>
 </Button>
 );
}

 // Отменить (не RECEIVED и не CANCELLED)
 if (!['RECEIVED', 'CANCELLED'].includes(order.status) && canApprove) {
 actions.push(
 <Button key="cancel"variant="ghost"size="sm"className="text-secondary"onClick={() => performAction(order.id, 'cancel')}>
 <Ban className="h-4 w-4"/>
 </Button>
 );
}

 // Удалить (DRAFT, CANCELLED)
 if ((order.status === 'DRAFT' || order.status === 'CANCELLED') && ['DEVELOPER', 'DIRECTOR', 'ADMIN'].includes(userRole)) {
 actions.push(
 <Button key="delete"variant="ghost"size="sm"className="text-macos-red"onClick={() => { setDeletingOrder(order); setDeleteModalOpen(true);}}>
 <Trash2 className="h-4 w-4"/>
 </Button>
 );
}

 return <div className="flex gap-1 flex-wrap">{actions}</div>;
};

 return (
 <>
 {/* Статистика (мини-дашборд) */}
 {stats && (
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
 <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-xl p-4 flex items-center gap-3">
 <div className="p-2.5 rounded-lg bg-tint-blue">
 <Package className="h-5 w-5 text-macos-blue"/>
 </div>
 <div>
 <p className="text-[24px] font-bold tracking-[-0.025em] leading-tight text-gray-800">{stats.total}</p>
 <p className="text-xs text-secondary">Всего заказов</p>
 </div>
 </div>
 <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-xl p-4 flex items-center gap-3">
 <div className="p-2.5 rounded-lg bg-[rgba(255,204,0,0.06)]">
 <Clock className="h-5 w-5 text-macos-orange"/>
 </div>
 <div>
 <p className="text-[24px] font-bold tracking-[-0.025em] leading-tight text-gray-800">{(stats.byStatus?.['PENDING'] || 0) + (stats.byStatus?.['DRAFT'] || 0)}</p>
 <p className="text-xs text-secondary">На рассмотрении</p>
 </div>
 </div>
 <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-xl p-4 flex items-center gap-3">
 <div className="p-2.5 rounded-lg bg-[rgba(52,199,89,0.06)]">
 <TrendingUp className="h-5 w-5 text-macos-green"/>
 </div>
 <div>
 <p className="text-[24px] font-bold tracking-[-0.025em] leading-tight text-gray-800">{(stats.byStatus?.['ORDERED'] || 0) + (stats.byStatus?.['DELIVERED'] || 0)}</p>
 <p className="text-xs text-secondary">В процессе</p>
 </div>
 </div>
 <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-xl p-4 flex items-center gap-3">
 <div className="p-2.5 rounded-lg bg-emerald-50">
 <DollarSign className="h-5 w-5 text-emerald-600"/>
 </div>
 <div>
 <p className="text-lg font-bold text-gray-800">{currency.format(stats.totalSpent || 0)}</p>
 <p className="text-xs text-secondary">Общие расходы</p>
 </div>
 </div>
 </div>
 )}

 {/* Фильтры */}
 <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-xl p-4 mb-4">
 <div className="flex flex-wrap gap-3 items-end">
 <div className="flex-1 min-w-[220px]">
 <label className="block text-xs font-medium text-secondary mb-1">Поиск</label>
 <div className="relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-tertiary"/>
 <Input
 placeholder="Поиск по номеру, названию..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="pl-10"
 />
 </div>
 </div>
 <div>
 <label className="block text-xs font-medium text-secondary mb-1">Статус</label>
 <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 mezon-field rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
 <option value="">Все статусы</option>
 {Object.entries(purchaseOrderStatusLabels).map(([k, v]) => (
 <option key={k} value={k}>{v}</option>
 ))}
 </select>
 </div>
 <div>
 <label className="block text-xs font-medium text-secondary mb-1">Тип</label>
 <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-2 mezon-field rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
 <option value="">Все типы</option>
 <option value="PLANNED">Плановая</option>
 <option value="OPERATIONAL">Оперативная</option>
 </select>
 </div>
 <div>
 <Button variant="outline"size="sm"onClick={() => { fetchOrders(); fetchStats();}} className="h-[38px]">
 <RefreshCw className="h-4 w-4"/>
 </Button>
 </div>

 {canCreate && (
 <div className="flex gap-2 ml-auto">
 <Button onClick={() => handleCreate('PLANNED')} className="bg-macos-blue hover:bg-blue-700 shadow-sm">
 <PlusCircle className="mr-2 h-4 w-4"/> Плановая закупка
 </Button>
 <Button onClick={() => handleCreate('OPERATIONAL')} className="bg-macos-red hover:bg-red-700 shadow-sm">
 <PlusCircle className="mr-2 h-4 w-4"/> Оперативная
 </Button>
 </div>
 )}
 </div>
 </div>

 {/* Таблица заказов */}
 {loading ? (
 <div className="text-center py-16">
 <RefreshCw className="h-8 w-8 animate-spin text-blue-400 mx-auto mb-3"/>
 <p className="text-secondary">Загрузка заказов...</p>
 </div>
 ) : orders.length === 0 ? (
 <div className="text-center py-16 bg-white border border-[rgba(0,0,0,0.08)] rounded-xl">
 <Archive className="h-12 w-12 text-tertiary mx-auto mb-3"/>
 <p className="text-secondary font-medium">Заказов пока нет</p>
 <p className="text-sm text-tertiary mt-1">Создайте первый заказ на закупку</p>
 </div>
 ) : (
 <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-xl overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full border-collapse text-sm">
 <thead>
 <tr className="border-b bg-fill-quaternary/80">
 <th className="text-left p-3 font-semibold text-secondary">№</th>
 <th className="text-left p-3 font-semibold text-secondary">Тип</th>
 <th className="text-left p-3 font-semibold text-secondary">Название</th>
 <th className="text-left p-3 font-semibold text-secondary">Поставщик</th>
 <th className="text-left p-3 font-semibold text-secondary">Дата</th>
 <th className="text-right p-3 font-semibold text-secondary">Сумма</th>
 <th className="text-left p-3 font-semibold text-secondary">Приоритет</th>
 <th className="text-left p-3 font-semibold text-secondary">Статус</th>
 <th className="text-left p-3 font-semibold text-secondary">Склад</th>
 <th className="text-left p-3 font-semibold text-secondary">Действия</th>
 </tr>
 </thead>
 <tbody>
 {orders.map((order) => {
 const hasInventoryLinks = order.items?.some(i => i.inventoryItemId);
 const allLinked = order.items?.length > 0 && order.items.every(i => i.inventoryItemId);
 
 return (
 <tr key={order.id} className="border-b hover:bg-fill-quaternary/50 macos-transition">
 <td className="p-3 font-mono text-xs text-secondary">{order.orderNumber}</td>
 <td className="p-3">
 <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${purchaseOrderTypeColors[order.type]}`}>
 {purchaseOrderTypeLabels[order.type]}
 </span>
 </td>
 <td className="p-3 font-medium max-w-[200px] truncate text-gray-800">{order.title}</td>
 <td className="p-3 text-secondary">{order.supplier?.name || <span className="text-tertiary italic">—</span>}</td>
 <td className="p-3 text-xs whitespace-nowrap text-secondary">{new Date(order.orderDate).toLocaleDateString('ru-RU')}</td>
 <td className="p-3 text-right whitespace-nowrap font-semibold text-gray-800">{currency.format(order.totalAmount)}</td>
 <td className="p-3">
 <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColors[order.priority] || 'bg-fill-tertiary'}`}>
 {priorityLabels[order.priority] || 'Обычный'}
 </span>
 </td>
 <td className="p-3">{getStatusBadge(order.status)}</td>
 <td className="p-3">
 {hasInventoryLinks ? (
 <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${allLinked ? 'bg-[rgba(52,199,89,0.12)] text-macos-green' : 'bg-[rgba(255,204,0,0.12)] text-macos-orange'}`}>
 <Link2 className="h-3 w-3"/>
 {allLinked ? 'Связан' : 'Частично'}
 </span>
 ) : (
 <span className="text-tertiary text-xs">—</span>
 )}
 </td>
 <td className="p-3">{renderActions(order)}</td>
 </tr>
 );
})}
 </tbody>
 </table>
 </div>
 <div className="px-4 py-3 border-t bg-fill-quaternary/50 text-xs text-secondary flex justify-between items-center">
 <span>Показано {orders.length} заказ(ов)</span>
 <span>Общая сумма: <strong className="text-primary">{currency.format(orders.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0))}</strong></span>
 </div>
 </div>
 )}

 {/* Модал создания/редактирования */}
 <Modal
 isOpen={isModalOpen}
 onClose={() => { setIsModalOpen(false); setEditingOrder(null);}}
 title={editingOrder?.id ? `Редактировать заказ ${editingOrder.orderNumber}`: 'Новый заказ на закупку'}
 >
 <PurchaseOrderForm
 initialData={editingOrder}
 onSuccess={handleFormSuccess}
 onCancel={() => { setIsModalOpen(false); setEditingOrder(null);}}
 />
 </Modal>

 {/* Модал просмотра деталей */}
 <Modal isOpen={!!viewOrder} onClose={() => setViewOrder(null)} title={viewOrder ? `Заказ ${viewOrder.orderNumber}`: ''}>
 {viewOrder && (
 <div className="space-y-5 p-2 max-h-[75vh] overflow-y-auto">
 {/* Шапка с ключевой информацией */}
 <div className="grid grid-cols-2 gap-3">
 <div className="bg-fill-quaternary rounded-lg p-3">
 <p className="text-xs text-secondary mb-1">Тип закупки</p>
 <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${purchaseOrderTypeColors[viewOrder.type]}`}>{purchaseOrderTypeLabels[viewOrder.type]}</span>
 </div>
 <div className="bg-fill-quaternary rounded-lg p-3">
 <p className="text-xs text-secondary mb-1">Статус</p>
 {getStatusBadge(viewOrder.status)}
 </div>
 <div className="bg-fill-quaternary rounded-lg p-3">
 <p className="text-xs text-secondary mb-1">Приоритет</p>
 <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColors[viewOrder.priority]}`}>{priorityLabels[viewOrder.priority]}</span>
 </div>
 <div className="bg-tint-blue rounded-lg p-3">
 <p className="text-xs text-macos-blue mb-1">Итого</p>
 <p className="text-lg font-bold text-macos-blue">{currency.format(viewOrder.totalAmount)}</p>
 </div>
 </div>

 {/* Детали */}
 <div className="space-y-2 text-sm">
 <div className="flex justify-between py-1.5 border-b border-[rgba(0,0,0,0.04)]">
 <span className="text-secondary">Поставщик</span>
 <span className="font-medium">{viewOrder.supplier?.name || <span className="text-tertiary italic">Не указан</span>}</span>
 </div>
 <div className="flex justify-between py-1.5 border-b border-[rgba(0,0,0,0.04)]">
 <span className="text-secondary">Дата заказа</span>
 <span>{new Date(viewOrder.orderDate).toLocaleDateString('ru-RU')}</span>
 </div>
 {viewOrder.expectedDeliveryDate && (
 <div className="flex justify-between py-1.5 border-b border-[rgba(0,0,0,0.04)]">
 <span className="text-secondary">Ожид. доставка</span>
 <span>{new Date(viewOrder.expectedDeliveryDate).toLocaleDateString('ru-RU')}</span>
 </div>
 )}
 {viewOrder.actualDeliveryDate && (
 <div className="flex justify-between py-1.5 border-b border-[rgba(0,0,0,0.04)]">
 <span className="text-secondary">Факт. доставка</span>
 <span className="text-macos-green">{new Date(viewOrder.actualDeliveryDate).toLocaleDateString('ru-RU')}</span>
 </div>
 )}
 {viewOrder.budgetSource && (
 <div className="flex justify-between py-1.5 border-b border-[rgba(0,0,0,0.04)]">
 <span className="text-secondary">Источник</span>
 <span>{viewOrder.budgetSource}</span>
 </div>
 )}
 <div className="flex justify-between py-1.5 border-b border-[rgba(0,0,0,0.04)]">
 <span className="text-secondary">Создатель</span>
 <span>{viewOrder.createdBy ? `${viewOrder.createdBy.firstName} ${viewOrder.createdBy.lastName}`: '—'}</span>
 </div>
 {viewOrder.approvedBy && (
 <div className="flex justify-between py-1.5 border-b border-[rgba(0,0,0,0.04)]">
 <span className="text-secondary">Одобрил</span>
 <span>{viewOrder.approvedBy.firstName} {viewOrder.approvedBy.lastName} {viewOrder.approvedAt ? `(${new Date(viewOrder.approvedAt).toLocaleDateString('ru-RU')})`: ''}</span>
 </div>
 )}
 {viewOrder.receivedBy && (
 <div className="flex justify-between py-1.5 border-b border-[rgba(0,0,0,0.04)]">
 <span className="text-secondary">Принял на склад</span>
 <span className="text-macos-green">{viewOrder.receivedBy.firstName} {viewOrder.receivedBy.lastName}</span>
 </div>
 )}
 </div>

 {viewOrder.description && (
 <div className="bg-fill-quaternary rounded-lg p-3">
 <p className="text-xs text-secondary mb-1">Обоснование</p>
 <p className="text-sm">{viewOrder.description}</p>
 </div>
 )}

 {viewOrder.rejectionReason && (
 <div className="p-3 bg-[rgba(255,59,48,0.06)] border border-red-200 rounded-lg text-sm text-macos-red">
 <div className="flex items-center gap-1.5 mb-1 font-medium">
 <AlertCircle className="h-4 w-4"/>
 Причина отклонения
 </div>
 {viewOrder.rejectionReason}
 </div>
 )}

 {viewOrder.receiveNote && (
 <div className="bg-[rgba(52,199,89,0.06)] border border-green-200 rounded-lg p-3 text-sm text-macos-green">
 <p className="font-medium mb-0.5">Примечание приёмки</p>
 {viewOrder.receiveNote}
 </div>
 )}
 
 {/* Позиции заказа */}
 <div className="border-t pt-4">
 <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
 <Package className="h-4 w-4"/>
 Позиции заказа ({viewOrder.items?.length || 0})
 </h4>
 <div className="rounded-lg border border-[rgba(0,0,0,0.08)] overflow-hidden">
 <table className="w-full text-sm border-collapse">
 <thead>
 <tr className="bg-fill-quaternary border-b">
 <th className="p-2.5 text-left text-xs font-semibold text-secondary">Наименование</th>
 <th className="p-2.5 text-right text-xs font-semibold text-secondary">Заказано</th>
 <th className="p-2.5 text-right text-xs font-semibold text-secondary">Принято</th>
 <th className="p-2.5 text-left text-xs font-semibold text-secondary">Ед.</th>
 <th className="p-2.5 text-right text-xs font-semibold text-secondary">Цена</th>
 <th className="p-2.5 text-right text-xs font-semibold text-secondary">Сумма</th>
 <th className="p-2.5 text-center text-xs font-semibold text-secondary">Склад</th>
 </tr>
 </thead>
 <tbody>
 {viewOrder.items?.map((item) => (
 <tr key={item.id} className="border-b last:border-b-0">
 <td className="p-2.5 font-medium">{item.name}</td>
 <td className="p-2.5 text-right">{item.quantity}</td>
 <td className="p-2.5 text-right">
 {item.receivedQuantity != null ? (
 <span className={item.receivedQuantity < item.quantity ? 'text-orange-600' : 'text-macos-green'}>
 {item.receivedQuantity}
 </span>
 ) : '—'}
 </td>
 <td className="p-2.5 text-secondary">{item.unit}</td>
 <td className="p-2.5 text-right">{currency.format(item.price)}</td>
 <td className="p-2.5 text-right font-medium">{currency.format(item.totalPrice)}</td>
 <td className="p-2.5 text-center">
 {item.inventoryItemId ? (
 <span className="inline-flex items-center gap-0.5 text-macos-green"title={`Связан с складским товаром #${item.inventoryItemId}`}>
 <Link2 className="h-3.5 w-3.5"/>
 </span>
 ) : (
 <span className="text-tertiary">—</span>
 )}
 </td>
 </tr>
 ))}
 </tbody>
 <tfoot>
 <tr className="border-t-2 font-bold bg-tint-blue/50">
 <td colSpan={5} className="p-2.5 text-right text-secondary">Итого:</td>
 <td className="p-2.5 text-right text-macos-blue">{currency.format(viewOrder.totalAmount)}</td>
 <td></td>
 </tr>
 </tfoot>
 </table>
 </div>
 </div>
 </div>
 )}
 </Modal>

 {/* Модал отклонения */}
 <Modal isOpen={rejectModalOpen} onClose={() => { setRejectModalOpen(false); setRejectReason(''); setActionOrder(null);}} title="Отклонить закупку">
 <div className="space-y-4 p-2">
 <p className="text-sm text-secondary">Укажите причину отклонения для заказа <strong>{actionOrder?.orderNumber}</strong>:</p>
 <textarea
 className="w-full p-2 border rounded text-sm"
 rows={3}
 value={rejectReason}
 onChange={(e) => setRejectReason(e.target.value)}
 placeholder="Причина отклонения..."
 />
 <div className="flex justify-end gap-2">
 <Button variant="outline"onClick={() => setRejectModalOpen(false)} disabled={actionLoading}>Отмена</Button>
 <Button variant="destructive"onClick={() => actionOrder && performAction(actionOrder.id, 'reject', { reason: rejectReason})} disabled={actionLoading || rejectReason.length < 3}>
 {actionLoading ? 'Отклонение...' : 'Отклонить'}
 </Button>
 </div>
 </div>
 </Modal>

 {/* Модал приёмки на склад */}
 <Modal isOpen={receiveModalOpen} onClose={() => { setReceiveModalOpen(false); setReceiveNote(''); setReceiveOrderState(null);}} title="Приёмка товара на склад">
 {receiveOrder && (
 <div className="space-y-4 p-2">
 <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm">
 <p className="font-medium text-emerald-800 mb-1 flex items-center gap-2">
 <ClipboardCheck className="h-4 w-4"/>
 Заказ {receiveOrder.orderNumber}: {receiveOrder.title}
 </p>
 <p className="text-emerald-700 text-xs">
 Следующие товары будут добавлены на склад. Если товар привязан к складской позиции — количество обновится автоматически. Если нет — будет создана новая складская позиция.
 </p>
 </div>
 <div className="rounded-lg border border-[rgba(0,0,0,0.08)] overflow-hidden">
 <table className="w-full text-sm border-collapse">
 <thead>
 <tr className="bg-fill-quaternary border-b">
 <th className="p-2.5 text-left text-xs font-semibold text-secondary">Товар</th>
 <th className="p-2.5 text-right text-xs font-semibold text-secondary">Кол-во</th>
 <th className="p-2.5 text-left text-xs font-semibold text-secondary">Ед.</th>
 <th className="p-2.5 text-center text-xs font-semibold text-secondary">Склад</th>
 </tr>
 </thead>
 <tbody>
 {receiveOrder.items?.map((item) => (
 <tr key={item.id} className="border-b last:border-b-0">
 <td className="p-2.5 font-medium">{item.name}</td>
 <td className="p-2.5 text-right font-semibold text-emerald-700">+{item.quantity}</td>
 <td className="p-2.5 text-secondary">{item.unit}</td>
 <td className="p-2.5 text-center">
 {item.inventoryItemId ? (
 <span className="inline-flex items-center gap-1 text-macos-green text-xs">
 <Link2 className="h-3 w-3"/> Обновится
 </span>
 ) : (
 <span className="text-macos-orange text-xs">Новый товар</span>
 )}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest text-primary mb-1">Примечание (необязательно)</label>
 <textarea className="w-full p-2.5 mezon-field rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"rows={2} value={receiveNote} onChange={(e) => setReceiveNote(e.target.value)} placeholder="Примечание при приёмке..."/>
 </div>
 <div className="flex justify-end gap-2">
 <Button variant="outline"onClick={() => setReceiveModalOpen(false)} disabled={actionLoading}>Отмена</Button>
 <Button onClick={handleReceiveSubmit} disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-700">
 {actionLoading ? 'Приёмка...' : 'Принять на склад'}
 </Button>
 </div>
 </div>
 )}
 </Modal>

 {/* Модал удаления */}
 <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Подтверждение удаления">
 <div className="p-4 space-y-4">
 <div className="flex items-start gap-3 p-4 bg-[rgba(255,59,48,0.06)] border border-red-200 rounded-lg">
 <AlertTriangle className="h-6 w-6 text-macos-red flex-shrink-0 mt-0.5"/>
 <div>
 <h4 className="font-semibold text-red-800">Внимание!</h4>
 <p className="text-macos-red text-sm mt-1">Вы собираетесь удалить заказ на закупку. Это действие нельзя отменить.</p>
 </div>
 </div>
 {deletingOrder && (
 <div className="bg-fill-quaternary p-3 rounded-lg text-sm">
 <p><strong>№:</strong> {deletingOrder.orderNumber}</p>
 <p><strong>Название:</strong> {deletingOrder.title}</p>
 <p><strong>Сумма:</strong> {currency.format(deletingOrder.totalAmount)}</p>
 </div>
 )}
 <div className="flex justify-end gap-2 pt-2">
 <Button variant="outline"onClick={() => setDeleteModalOpen(false)} disabled={deleting}>Отмена</Button>
 <Button variant="destructive"onClick={handleDelete} disabled={deleting}>{deleting ? 'Удаление...' : 'Удалить'}</Button>
 </div>
 </div>
 </Modal>
 </>
 );
}

// =====================================================
// Поставщики
// =====================================================
function SuppliersView() {
 const { user} = useAuth();
 const userRole = user?.role || 'TEACHER';
 const canManage = ['DEVELOPER', 'DIRECTOR', 'ADMIN', 'ZAVHOZ'].includes(userRole);

 const [suppliers, setSuppliers] = useState<Supplier[]>([]);
 const [loading, setLoading] = useState(true);
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
 const [deleteModalOpen, setDeleteModalOpen] = useState(false);
 const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
 const [deleting, setDeleting] = useState(false);
 const [searchQuery, setSearchQuery] = useState('');

 const fetchSuppliers = useCallback(async () => {
 setLoading(true);
 try {
 const data = await api.get('/api/procurement/suppliers');
 setSuppliers(Array.isArray(data) ? data : []);
} catch {
 toast.error('Ошибка загрузки поставщиков');
} finally {
 setLoading(false);
}
}, []);

 useEffect(() => { fetchSuppliers();}, [fetchSuppliers]);

 const filteredSuppliers = suppliers.filter(s =>
 !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 s.contactInfo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
 s.phone?.toLowerCase().includes(searchQuery.toLowerCase())
 );

 const handleDelete = async () => {
 if (!deletingSupplier) return;
 setDeleting(true);
 try {
 await api.delete(`/api/procurement/suppliers/${deletingSupplier.id}`);
 toast.success('Поставщик удалён');
 setDeleteModalOpen(false);
 setDeletingSupplier(null);
 fetchSuppliers();
} catch (error: any) {
 toast.error(error?.message || 'Ошибка удаления');
} finally {
 setDeleting(false);
}
};

 const handleFormSuccess = () => {
 setIsModalOpen(false);
 setEditingSupplier(null);
 fetchSuppliers();
 toast.success(editingSupplier ? 'Поставщик обновлён' : 'Поставщик добавлен');
};

 return (
 <>
 <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-xl p-4 mb-4">
 <div className="flex gap-3 items-end">
 <div className="flex-1 min-w-[220px]">
 <label className="block text-xs font-medium text-secondary mb-1">Поиск поставщика</label>
 <div className="relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-tertiary"/>
 <Input
 placeholder="Название, телефон, контакты..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="pl-10"
 />
 </div>
 </div>
 {canManage && (
 <Button onClick={() => { setEditingSupplier(null); setIsModalOpen(true);}} className="shadow-sm">
 <PlusCircle className="mr-2 h-4 w-4"/> Добавить поставщика
 </Button>
 )}
 </div>
 </div>

 {loading ? (
 <div className="text-center py-16">
 <RefreshCw className="h-8 w-8 animate-spin text-blue-400 mx-auto mb-3"/>
 <p className="text-secondary">Загрузка поставщиков...</p>
 </div>
 ) : filteredSuppliers.length === 0 ? (
 <div className="text-center py-16 bg-white border border-[rgba(0,0,0,0.08)] rounded-xl">
 <Users className="h-12 w-12 text-tertiary mx-auto mb-3"/>
 <p className="text-secondary font-medium">{searchQuery ? 'Поставщики не найдены' : 'Поставщиков пока нет'}</p>
 <p className="text-sm text-tertiary mt-1">{searchQuery ? 'Попробуйте изменить поиск' : 'Добавьте первого поставщика'}</p>
 </div>
 ) : (
 <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
 {filteredSuppliers.map((s) => (
 <div key={s.id} className="bg-white border border-[rgba(0,0,0,0.08)] rounded-xl p-4 hover:shadow-md transition-shadow">
 <div className="flex justify-between items-start mb-3">
 <div className="flex items-center gap-2">
 <div className={`w-2 h-2 rounded-full ${s.isActive ? 'bg-[rgba(52,199,89,0.06)]0' : 'bg-gray-400'}`} />
 <h3 className="font-semibold text-gray-800">{s.name}</h3>
 </div>
 {canManage && (
 <div className="flex gap-1">
 <Button variant="ghost"size="sm"onClick={() => { setEditingSupplier(s); setIsModalOpen(true);}} className="h-8 w-8 p-0">
 <Edit className="h-3.5 w-3.5 text-secondary"/>
 </Button>
 <Button variant="ghost"size="sm"className="h-8 w-8 p-0 text-red-400 hover:text-macos-red"onClick={() => { setDeletingSupplier(s); setDeleteModalOpen(true);}}>
 <Trash2 className="h-3.5 w-3.5"/>
 </Button>
 </div>
 )}
 </div>
 <div className="space-y-1.5 text-sm text-secondary">
 {s.phone && (
 <div className="flex items-center gap-2">
 <span className="text-tertiary">📞</span> {s.phone}
 </div>
 )}
 {s.email && (
 <div className="flex items-center gap-2">
 <span className="text-tertiary">✉️</span> {s.email}
 </div>
 )}
 {s.inn && (
 <div className="flex items-center gap-2">
 <span className="text-tertiary">🏢</span> <span className="font-mono text-xs">{s.inn}</span>
 </div>
 )}
 {s.contactInfo && (
 <div className="text-xs text-secondary mt-1 line-clamp-2">{s.contactInfo}</div>
 )}
 </div>
 <div className="mt-3 pt-3 border-t border-[rgba(0,0,0,0.04)] flex justify-between items-center">
 <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.isActive ? 'bg-[rgba(52,199,89,0.12)] text-macos-green' : 'bg-fill-tertiary text-secondary'}`}>
 {s.isActive ? 'Активен' : 'Неактивен'}
 </span>
 <span className="text-xs text-secondary">{s._count?.orders ?? 0} заказ(ов)</span>
 </div>
 </div>
 ))}
 </div>
 )}

 <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingSupplier ? 'Редактировать поставщика' : 'Новый поставщик'}>
 <SupplierForm initialData={editingSupplier} onSuccess={handleFormSuccess} onCancel={() => setIsModalOpen(false)} />
 </Modal>

 <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Подтверждение удаления">
 <div className="p-4 space-y-4">
 <div className="flex items-start gap-3 p-4 bg-[rgba(255,59,48,0.06)] border border-red-200 rounded-lg">
 <AlertTriangle className="h-6 w-6 text-macos-red flex-shrink-0 mt-0.5"/>
 <div>
 <h4 className="font-semibold text-red-800">Внимание!</h4>
 <p className="text-macos-red text-sm mt-1">Удаление поставщика невозможно если у него есть заказы.</p>
 </div>
 </div>
 {deletingSupplier && (
 <div className="bg-fill-quaternary p-3 rounded-lg text-sm">
 <p><strong>Название:</strong> {deletingSupplier.name}</p>
 <p><strong>Контакты:</strong> {deletingSupplier.contactInfo || '—'}</p>
 </div>
 )}
 <div className="flex justify-end gap-2">
 <Button variant="outline"onClick={() => setDeleteModalOpen(false)} disabled={deleting}>Отмена</Button>
 <Button variant="destructive"onClick={handleDelete} disabled={deleting}>{deleting ? 'Удаление...' : 'Удалить'}</Button>
 </div>
 </div>
 </Modal>
 </>
 );
}
