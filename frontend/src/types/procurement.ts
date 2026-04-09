// Procurement types — Закупки

// Тип закупки
export type PurchaseOrderType = 'PLANNED' | 'OPERATIONAL';

// Статус закупки (workflow)
export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'ORDERED'
  | 'PARTIALLY_DELIVERED'
  | 'DELIVERED'
  | 'RECEIVED'
  | 'CANCELLED';

// Поставщик
export interface Supplier {
  id: number;
  name: string;
  contactInfo?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  inn?: string | null;
  isActive: boolean;
  pricelist?: Record<string, number> | null;
  _count?: { orders: number };
  createdAt: string;
  updatedAt: string;
}

// Позиция закупки
export interface PurchaseOrderItem {
  id: number;
  orderId: number;
  name: string;
  quantity: number;
  receivedQuantity?: number | null;
  unit: string;
  price: number;
  totalPrice: number;
  ingredientId?: number | null;
  inventoryItemId?: number | null;
  ingredient?: { id: number; name: string; unit: string } | null;
  inventoryItem?: { id: number; name: string; quantity: number; unit: string; type: string } | null;
}

// Заказ на закупку
export interface PurchaseOrder {
  id: number;
  orderNumber: string;
  type: PurchaseOrderType;
  status: PurchaseOrderStatus;
  supplierId?: number | null;
  supplier?: { id: number; name: string; contactInfo?: string | null } | null;
  title: string;
  description?: string | null;
  priority: number;
  orderDate: string;
  expectedDeliveryDate?: string | null;
  actualDeliveryDate?: string | null;
  totalAmount: number;
  budgetSource?: string | null;
  createdById: number;
  createdBy?: { id: number; firstName: string; lastName: string; position?: string };
  approvedById?: number | null;
  approvedBy?: { id: number; firstName: string; lastName: string } | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  receivedById?: number | null;
  receivedBy?: { id: number; firstName: string; lastName: string } | null;
  receivedAt?: string | null;
  receiveNote?: string | null;
  items: PurchaseOrderItem[];
  createdAt: string;
  updatedAt: string;
}

// Маппинг статусов
export const purchaseOrderStatusLabels: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'Черновик',
  PENDING: 'На рассмотрении',
  APPROVED: 'Одобрена',
  REJECTED: 'Отклонена',
  ORDERED: 'Заказано',
  PARTIALLY_DELIVERED: 'Частично доставлено',
  DELIVERED: 'Доставлено',
  RECEIVED: 'Принято на склад',
  CANCELLED: 'Отменена',
};

export const purchaseOrderStatusColors: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  ORDERED: 'bg-blue-100 text-blue-800',
  PARTIALLY_DELIVERED: 'bg-orange-100 text-orange-800',
  DELIVERED: 'bg-indigo-100 text-indigo-800',
  RECEIVED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-gray-200 text-gray-600',
};

export const purchaseOrderTypeLabels: Record<PurchaseOrderType, string> = {
  PLANNED: 'Плановая',
  OPERATIONAL: 'Оперативная',
};

export const purchaseOrderTypeColors: Record<PurchaseOrderType, string> = {
  PLANNED: 'bg-blue-100 text-blue-800',
  OPERATIONAL: 'bg-red-100 text-red-800',
};

export const priorityLabels: Record<number, string> = {
  0: 'Обычный',
  1: 'Срочный',
  2: 'Критический',
};

export const priorityColors: Record<number, string> = {
  0: 'bg-gray-100 text-gray-700',
  1: 'bg-orange-100 text-orange-800',
  2: 'bg-red-100 text-red-800',
};

// Результат приёмки
export interface ReceiveResult {
  success: boolean;
  receivedItems: {
    itemName: string;
    ordered: number;
    received: number;
    addedToStock: number;
    inventoryItemId: number | null;
  }[];
  warnings: string[];
}

// Статистика закупок
export interface ProcurementStats {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  totalSpent: number;
}
