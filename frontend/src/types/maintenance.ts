// Типы для модуля Заявки (Maintenance)
import { z } from 'zod';

// Типы соответствуют schema.prisma

// MaintenanceStatus enum
export type MaintenanceStatus = 
  | 'PENDING'      // Ожидает одобрения (показывается Директору/Завучу)
  | 'APPROVED'     // Одобрена (показывается Завхозу)
  | 'REJECTED'     // Отклонена
  | 'IN_PROGRESS'  // В работе (у Завхоза)
  | 'DONE';        // Выполнена

// MaintenanceType enum
export type MaintenanceType = 
  | 'REPAIR'  // Ремонт
  | 'ISSUE';  // Выдача

// ItemCategory enum (для заявок на выдачу)
export type ItemCategory = 
  | 'STATIONERY'  // Канц.товары
  | 'HOUSEHOLD'   // Хоз.товары
  | 'OTHER';      // Прочее

// Маппинг для отображения статусов
export const maintenanceStatusLabels: Record<MaintenanceStatus, string> = {
  PENDING: 'Ожидает одобрения',
  APPROVED: 'Одобрена',
  REJECTED: 'Отклонена',
  IN_PROGRESS: 'В работе',
  DONE: 'Выполнено',
};

export const maintenanceStatusColors: Record<MaintenanceStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  DONE: 'bg-gray-100 text-gray-800',
};

// Маппинг для типов заявок
export const maintenanceTypeLabels: Record<MaintenanceType, string> = {
  REPAIR: 'Ремонт',
  ISSUE: 'Выдача',
};

export const maintenanceTypeColors: Record<MaintenanceType, string> = {
  REPAIR: 'bg-orange-100 text-orange-800',
  ISSUE: 'bg-purple-100 text-purple-800',
};

// Маппинг для категорий товаров
export const itemCategoryLabels: Record<ItemCategory, string> = {
  STATIONERY: 'Канц.товары',
  HOUSEHOLD: 'Хоз.товары',
  OTHER: 'Прочее',
};

export const itemCategoryColors: Record<ItemCategory, string> = {
  STATIONERY: 'bg-blue-100 text-blue-800',
  HOUSEHOLD: 'bg-amber-100 text-amber-800',
  OTHER: 'bg-gray-100 text-gray-800',
};

// Тип данных позиции (товара) в заявке
export type MaintenanceItem = {
  id: number;
  requestId: number;
  name: string;
  quantity: number;
  issuedQuantity?: number | null; // Фактически выданное количество
  unit: string;
  category: ItemCategory;
  inventoryItemId?: number | null; // Связь с товаром на складе
  inventoryItem?: {
    id: number;
    name: string;
    quantity: number;
    unit: string;
    type?: string;
  } | null;
  createdAt: string;
};

// Тип данных заявки
export type MaintenanceRequest = {
  id: number;
  title: string;
  description?: string | null;
  type: MaintenanceType;
  status: MaintenanceStatus;
  // Позиции заявки (Master-Detail)
  items?: MaintenanceItem[];
  // Связанные данные
  requesterId: number;
  requester?: {
    id: number;
    firstName: string;
    lastName: string;
    position?: string;
    user?: { role: string };
  };
  approvedById?: number | null;
  approvedBy?: {
    id: number;
    firstName: string;
    lastName: string;
  } | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
};

// Схема для позиции в форме
const maintenanceItemFormSchema = z.object({
  name: z.string().min(1, 'Наименование товара обязательно'),
  quantity: z.number().positive('Количество должно быть положительным'),
  unit: z.string().min(1, 'Единица измерения обязательна'),
  category: z.enum(['STATIONERY', 'HOUSEHOLD', 'OTHER']),
  inventoryItemId: z.number().int().positive().optional().nullable(), // Связь со складом
});

// Схема валидации для создания заявки
export const createMaintenanceSchema = z.object({
  title: z.string().min(3, 'Наименование обязательно (минимум 3 символа)'),
  description: z.string().optional(),
  type: z.enum(['REPAIR', 'ISSUE']),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'DONE']).optional(), // Добавляем статус для завхоза
  // Массив позиций для заявок типа ISSUE
  items: z.array(maintenanceItemFormSchema).optional(),
}).superRefine((data, ctx) => {
  // Если тип ISSUE, то items обязательно должен содержать хотя бы одну позицию
  if (data.type === 'ISSUE') {
    if (!data.items || data.items.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Для заявки на выдачу необходимо добавить хотя бы одну позицию',
        path: ['items'],
      });
    }
  }
  // Для типа REPAIR проверяем, что есть title
  if (data.type === 'REPAIR') {
    if (!data.title || data.title.length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Для заявки на ремонт необходимо указать тему (минимум 3 символа)',
        path: ['title'],
      });
    }
  }
});

// Схема валидации для обновления заявки
export const updateMaintenanceSchema = z.object({
  title: z.string().min(3, 'Наименование обязательно (минимум 3 символа)').optional(),
  description: z.string().optional(),
  type: z.enum(['REPAIR', 'ISSUE']).optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'DONE']).optional(),
  items: z.array(maintenanceItemFormSchema).optional(),
  rejectionReason: z.string().optional(),
});

export type MaintenanceFormData = z.infer<typeof createMaintenanceSchema>;
export type MaintenanceUpdateData = z.infer<typeof updateMaintenanceSchema>;
export type MaintenanceItemFormData = z.infer<typeof maintenanceItemFormSchema>;

