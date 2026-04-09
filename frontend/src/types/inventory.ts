// Типы для модуля Склад

// Типы соответствуют enum InventoryType в schema.prisma
export type InventoryType = 'FOOD' | 'HOUSEHOLD' | 'STATIONERY';

// Тип складской операции
export type InventoryTransactionType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'WRITE_OFF';

export type Item = {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  expiryDate?: string;
  type: InventoryType;
  minQuantity?: number;
};

export type InventoryItem = {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  minQuantity: number;
  expiryDate?: string | null;
  type: InventoryType;
  ingredientId?: number | null;
  ingredient?: {
    id: number;
    name: string;
    unit: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

// Транзакция складского движения
export type InventoryTransaction = {
  id: number;
  inventoryItemId: number;
  inventoryItem?: {
    id: number;
    name: string;
    unit: string;
    type: InventoryType;
  };
  type: InventoryTransactionType;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  reason?: string | null;
  maintenanceRequestId?: number | null;
  maintenanceRequest?: {
    id: number;
    title: string;
    type: string;
  } | null;
  performedById?: number | null;
  performedBy?: {
    id: number;
    firstName: string;
    lastName: string;
  } | null;
  createdAt: string;
};

// Маппинг типов для отображения
export const inventoryTypeLabels: Record<InventoryType, string> = {
  FOOD: 'Продукты',
  HOUSEHOLD: 'Хоз. товары',
  STATIONERY: 'Канц. товары',
};

export const inventoryTypeColors: Record<InventoryType, string> = {
  FOOD: 'bg-green-100 text-green-800',
  HOUSEHOLD: 'bg-amber-100 text-amber-800',
  STATIONERY: 'bg-blue-100 text-blue-800',
};

// Маппинг типов транзакций
export const transactionTypeLabels: Record<InventoryTransactionType, string> = {
  IN: 'Приход',
  OUT: 'Расход',
  ADJUSTMENT: 'Корректировка',
  WRITE_OFF: 'Списание',
};

export const transactionTypeColors: Record<InventoryTransactionType, string> = {
  IN: 'bg-green-100 text-green-800',
  OUT: 'bg-red-100 text-red-800',
  ADJUSTMENT: 'bg-yellow-100 text-yellow-800',
  WRITE_OFF: 'bg-gray-100 text-gray-800',
};

export type ShoppingListItem = {
  name: string;
  unit: string;
  requiredQty: number;
  inStock: number;
  toBuy: number;
};

// Проверка наличия на складе
export type StockCheckItem = {
  name: string;
  unit: string;
  requested: number;
  inStock: number;
  deficit: number;
  inventoryItemId: number | null;
};

export type StockCheckResult = {
  available: boolean;
  items: StockCheckItem[];
};
