// src/services/ProcurementService.ts
// Сервис для управления закупками с синхронизацией склада
import { prisma } from "../prisma";
import { PurchaseOrderStatus, PurchaseOrderType, Prisma } from "@prisma/client";
import { createIncomingTransaction } from "./InventorySyncService";

// =====================================================
// ГЕНЕРАЦИЯ НОМЕРА ЗАКАЗА
// =====================================================

/**
 * Генерирует уникальный номер заказа: PO-YYYYMM-XXXX
 */
export async function generateOrderNumber(): Promise<string> {
  const now = new Date();
  const prefix = `PO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  
  const lastOrder = await prisma.purchaseOrder.findFirst({
    where: { orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  });

  let seq = 1;
  if (lastOrder) {
    const parts = lastOrder.orderNumber.split("-");
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}-${String(seq).padStart(4, "0")}`;
}

// =====================================================
// ПОЛУЧЕНИЕ ЗАКАЗОВ
// =====================================================

export interface ProcurementFilters {
  status?: PurchaseOrderStatus;
  type?: PurchaseOrderType;
  supplierId?: number;
  createdById?: number;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

export async function getOrders(filters?: ProcurementFilters) {
  const where: Prisma.PurchaseOrderWhereInput = {};

  if (filters?.status) where.status = filters.status;
  if (filters?.type) where.type = filters.type;
  if (filters?.supplierId) where.supplierId = filters.supplierId;
  if (filters?.createdById) where.createdById = filters.createdById;
  if (filters?.search) {
    where.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { orderNumber: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  if (filters?.startDate || filters?.endDate) {
    where.orderDate = {};
    if (filters?.startDate) where.orderDate.gte = filters.startDate;
    if (filters?.endDate) where.orderDate.lte = filters.endDate;
  }

  return prisma.purchaseOrder.findMany({
    where,
    include: {
      supplier: { select: { id: true, name: true, contactInfo: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true, position: true } },
      approvedBy: { select: { id: true, firstName: true, lastName: true } },
      receivedBy: { select: { id: true, firstName: true, lastName: true } },
      items: {
        include: {
          ingredient: { select: { id: true, name: true, unit: true } },
          inventoryItem: { select: { id: true, name: true, quantity: true, unit: true, type: true } },
        },
      },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
}

export async function getOrderById(id: number) {
  return prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      createdBy: { select: { id: true, firstName: true, lastName: true, position: true } },
      approvedBy: { select: { id: true, firstName: true, lastName: true } },
      receivedBy: { select: { id: true, firstName: true, lastName: true } },
      items: {
        include: {
          ingredient: { select: { id: true, name: true, unit: true } },
          inventoryItem: { select: { id: true, name: true, quantity: true, unit: true, type: true } },
        },
      },
      inventoryTransactions: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });
}

// =====================================================
// СОЗДАНИЕ ЗАКАЗА
// =====================================================

export interface CreateOrderInput {
  type: PurchaseOrderType;
  supplierId?: number | null;
  title: string;
  description?: string;
  priority?: number;
  orderDate: Date;
  expectedDeliveryDate?: Date;
  budgetSource?: string;
  items: {
    name: string;
    quantity: number;
    unit: string;
    price: number;
    ingredientId?: number;
    inventoryItemId?: number;
  }[];
}

export async function createOrder(input: CreateOrderInput, createdById: number) {
  const orderNumber = await generateOrderNumber();

  // Вычисляем общую сумму
  const totalAmount = input.items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  const order = await prisma.purchaseOrder.create({
    data: {
      orderNumber,
      type: input.type,
      status: "DRAFT",
      supplierId: input.supplierId ?? undefined,
      title: input.title,
      description: input.description || null,
      priority: input.priority ?? 0,
      orderDate: input.orderDate,
      expectedDeliveryDate: input.expectedDeliveryDate || null,
      budgetSource: input.budgetSource || null,
      totalAmount,
      createdById,
      items: {
        create: input.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          price: item.price,
          totalPrice: item.quantity * item.price,
          ingredientId: item.ingredientId || null,
          inventoryItemId: item.inventoryItemId || null,
        })),
      },
    },
    include: {
      supplier: { select: { id: true, name: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      items: {
        include: {
          inventoryItem: { select: { id: true, name: true, quantity: true, unit: true } },
        },
      },
    },
  });

  return order;
}

// =====================================================
// ОБНОВЛЕНИЕ ЗАКАЗА
// =====================================================

export interface UpdateOrderInput {
  supplierId?: number;
  title?: string;
  description?: string;
  priority?: number;
  expectedDeliveryDate?: Date;
  budgetSource?: string;
  items?: {
    name: string;
    quantity: number;
    unit: string;
    price: number;
    ingredientId?: number;
    inventoryItemId?: number;
  }[];
}

export async function updateOrder(id: number, input: UpdateOrderInput) {
  const existing = await prisma.purchaseOrder.findUnique({
    where: { id },
    select: { status: true },
  });

  if (!existing) throw new Error("Заказ не найден");

  // Можно редактировать только DRAFT и REJECTED
  if (existing.status !== "DRAFT" && existing.status !== "REJECTED") {
    throw new Error("Можно редактировать только черновик или отклонённый заказ");
  }

  const { items, ...data } = input;

  // Пересчитываем сумму если есть items
  let totalAmount: number | undefined;
  if (items) {
    totalAmount = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  }

  const order = await prisma.purchaseOrder.update({
    where: { id },
    data: {
      ...data,
      totalAmount: totalAmount !== undefined ? totalAmount : undefined,
      // Если отклонённый — возвращаем в черновик при редактировании
      status: existing.status === "REJECTED" ? "DRAFT" : undefined,
      rejectionReason: existing.status === "REJECTED" ? null : undefined,
      items: items
        ? {
            deleteMany: {},
            create: items.map((item) => ({
              name: item.name,
              quantity: item.quantity,
              unit: item.unit,
              price: item.price,
              totalPrice: item.quantity * item.price,
              ingredientId: item.ingredientId || null,
              inventoryItemId: item.inventoryItemId || null,
            })),
          }
        : undefined,
    },
    include: {
      supplier: { select: { id: true, name: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      items: {
        include: {
          inventoryItem: { select: { id: true, name: true, quantity: true, unit: true } },
        },
      },
    },
  });

  return order;
}

// =====================================================
// WORKFLOW: ОТПРАВКА НА ОДОБРЕНИЕ
// =====================================================

export async function submitForApproval(id: number) {
  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!order) throw new Error("Заказ не найден");
  if (order.status !== "DRAFT") throw new Error("На одобрение можно отправить только черновик");
  if (order.items.length === 0) throw new Error("Нельзя отправить пустой заказ");

  return prisma.purchaseOrder.update({
    where: { id },
    data: { status: "PENDING" },
    include: {
      supplier: { select: { id: true, name: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      items: true,
    },
  });
}

// =====================================================
// WORKFLOW: ОДОБРЕНИЕ ДИРЕКТОРОМ
// =====================================================

export async function approveOrder(id: number, approvedById: number) {
  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    select: { status: true },
  });

  if (!order) throw new Error("Заказ не найден");
  if (order.status !== "PENDING") throw new Error("Одобрить можно только заказ со статусом «На рассмотрении»");

  return prisma.purchaseOrder.update({
    where: { id },
    data: {
      status: "APPROVED",
      approvedById,
      approvedAt: new Date(),
    },
    include: {
      supplier: { select: { id: true, name: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      approvedBy: { select: { id: true, firstName: true, lastName: true } },
      items: true,
    },
  });
}

// =====================================================
// WORKFLOW: ОТКЛОНЕНИЕ ДИРЕКТОРОМ
// =====================================================

export async function rejectOrder(id: number, rejectedById: number, reason: string) {
  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    select: { status: true },
  });

  if (!order) throw new Error("Заказ не найден");
  if (order.status !== "PENDING") throw new Error("Отклонить можно только заказ со статусом «На рассмотрении»");

  return prisma.purchaseOrder.update({
    where: { id },
    data: {
      status: "REJECTED",
      approvedById: rejectedById,
      approvedAt: new Date(),
      rejectionReason: reason,
    },
    include: {
      supplier: { select: { id: true, name: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      items: true,
    },
  });
}

// =====================================================
// WORKFLOW: ЗАКАЗАНО У ПОСТАВЩИКА
// =====================================================

export async function markAsOrdered(id: number) {
  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    select: { status: true },
  });

  if (!order) throw new Error("Заказ не найден");
  if (order.status !== "APPROVED") throw new Error("Отметить «Заказано» можно только одобренный заказ");

  return prisma.purchaseOrder.update({
    where: { id },
    data: { status: "ORDERED" },
    include: {
      supplier: { select: { id: true, name: true } },
      items: true,
    },
  });
}

// =====================================================
// WORKFLOW: ДОСТАВКА
// =====================================================

export async function markAsDelivered(id: number, actualDeliveryDate?: Date) {
  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    select: { status: true },
  });

  if (!order) throw new Error("Заказ не найден");
  if (order.status !== "ORDERED" && order.status !== "PARTIALLY_DELIVERED") {
    throw new Error("Отметить «Доставлено» можно только заказ со статусом «Заказано» или «Частично доставлено»");
  }

  return prisma.purchaseOrder.update({
    where: { id },
    data: {
      status: "DELIVERED",
      actualDeliveryDate: actualDeliveryDate || new Date(),
    },
    include: {
      supplier: { select: { id: true, name: true } },
      items: true,
    },
  });
}

// =====================================================
// WORKFLOW: ПРИЁМКА НА СКЛАД (синхронизация со складом)
// =====================================================

export interface ReceiveItemInput {
  itemId: number;
  receivedQuantity: number;
}

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

/**
 * Принимает товары на склад. 
 * Для каждой позиции заказа:
 *   1. Обновляет receivedQuantity в PurchaseOrderItem
 *   2. Находит или создаёт товар на складе (InventoryItem)
 *   3. Увеличивает количество на складе
 *   4. Создаёт InventoryTransaction (IN) с привязкой к закупке
 */
export async function receiveOrder(
  id: number,
  receivedById: number,
  receiveNote?: string,
  itemInputs?: ReceiveItemInput[]
): Promise<ReceiveResult> {
  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          inventoryItem: true,
          ingredient: true,
        },
      },
    },
  });

  if (!order) throw new Error("Заказ не найден");
  if (order.status !== "DELIVERED" && order.status !== "ORDERED" && order.status !== "PARTIALLY_DELIVERED") {
    throw new Error("Принять на склад можно только доставленный или заказанный заказ");
  }

  const result: ReceiveResult = {
    success: true,
    receivedItems: [],
    warnings: [],
  };

  await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      // Определяем принимаемое количество
      const itemInput = itemInputs?.find((i) => i.itemId === item.id);
      const receivedQty = itemInput?.receivedQuantity ?? item.quantity;

      if (receivedQty <= 0) continue;

      if (receivedQty < item.quantity) {
        result.warnings.push(
          `${item.name}: заказано ${item.quantity} ${item.unit}, принято ${receivedQty} ${item.unit}`
        );
      }

      // Обновляем receivedQuantity в позиции заказа
      await tx.purchaseOrderItem.update({
        where: { id: item.id },
        data: { receivedQuantity: receivedQty },
      });

      // Ищем или создаём товар на складе
      let inventoryItem = item.inventoryItemId
        ? await tx.inventoryItem.findUnique({ where: { id: item.inventoryItemId } })
        : null;

      if (!inventoryItem) {
        // Ищем по имени и ед.изм.
        inventoryItem = await tx.inventoryItem.findFirst({
          where: {
            name: { equals: item.name, mode: "insensitive" },
            unit: { equals: item.unit, mode: "insensitive" },
          },
        });
      }

      if (!inventoryItem) {
        // Создаём новый товар на складе
        inventoryItem = await tx.inventoryItem.create({
          data: {
            name: item.name,
            quantity: 0,
            unit: item.unit,
            type: "FOOD", // default type
            ingredientId: item.ingredientId || null,
          },
        });
        result.warnings.push(
          `Создан новый складской товар: "${item.name}" (${item.unit})`
        );
      }

      const quantityBefore = inventoryItem.quantity;
      const quantityAfter = quantityBefore + receivedQty;

      // Увеличиваем количество на складе
      await tx.inventoryItem.update({
        where: { id: inventoryItem.id },
        data: { quantity: quantityAfter },
      });

      // Создаём транзакцию прихода
      await tx.inventoryTransaction.create({
        data: {
          inventoryItemId: inventoryItem.id,
          type: "IN",
          quantity: receivedQty,
          quantityBefore,
          quantityAfter,
          reason: `Приёмка по закупке ${order.orderNumber}: ${order.title}`,
          purchaseOrderId: order.id,
          performedById: receivedById,
        },
      });

      // Привязываем позицию заказа к складскому товару
      await tx.purchaseOrderItem.update({
        where: { id: item.id },
        data: { inventoryItemId: inventoryItem.id },
      });

      result.receivedItems.push({
        itemName: item.name,
        ordered: item.quantity,
        received: receivedQty,
        addedToStock: receivedQty,
        inventoryItemId: inventoryItem.id,
      });
    }

    // Определяем: полная приёмка или частичная
    const allReceived = order.items.every((item) => {
      const input = itemInputs?.find((i) => i.itemId === item.id);
      const receivedQty = input?.receivedQuantity ?? item.quantity;
      return receivedQty >= item.quantity;
    });

    // Обновляем статус заказа
    await tx.purchaseOrder.update({
      where: { id },
      data: {
        status: allReceived ? "RECEIVED" : "PARTIALLY_DELIVERED",
        receivedById,
        receivedAt: new Date(),
        receiveNote: receiveNote || null,
      },
    });
  });

  return result;
}

// =====================================================
// WORKFLOW: ОТМЕНА ЗАКАЗА
// =====================================================

export async function cancelOrder(id: number, reason?: string) {
  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    select: { status: true },
  });

  if (!order) throw new Error("Заказ не найден");
  if (order.status === "RECEIVED" || order.status === "CANCELLED") {
    throw new Error("Нельзя отменить уже принятый или отменённый заказ");
  }

  return prisma.purchaseOrder.update({
    where: { id },
    data: {
      status: "CANCELLED",
      rejectionReason: reason || "Отменён",
    },
    include: {
      supplier: { select: { id: true, name: true } },
      items: true,
    },
  });
}

// =====================================================
// АНАЛИТИКА
// =====================================================

export async function getProcurementStats() {
  const [
    total,
    byStatus,
    byType,
    totalSpent,
  ] = await Promise.all([
    prisma.purchaseOrder.count(),
    prisma.purchaseOrder.groupBy({
      by: ["status"],
      _count: true,
    }),
    prisma.purchaseOrder.groupBy({
      by: ["type"],
      _count: true,
    }),
    prisma.purchaseOrder.aggregate({
      _sum: { totalAmount: true },
      where: { status: { in: ["RECEIVED", "DELIVERED"] } },
    }),
  ]);

  return {
    total,
    byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
    byType: Object.fromEntries(byType.map((t) => [t.type, t._count])),
    totalSpent: totalSpent._sum.totalAmount || 0,
  };
}

// =====================================================
// АВТО-ГЕНЕРАЦИЯ ЗАКАЗА ПО LOW STOCK
// =====================================================

/**
 * Генерирует черновик закупки на основе товаров с низким остатком.
 * Завхоз может вызвать, чтобы быстро создать оперативную закупку.
 */
export async function generateOrderFromLowStock(
  supplierId: number,
  createdById: number
): Promise<number> {
  // Находим товары ниже минимального остатка
  const lowStockItems = await prisma.$queryRaw<
    { id: number; name: string; quantity: number; unit: string; minQuantity: number }[]
  >`
    SELECT id, name, quantity, unit, "minQuantity" FROM "InventoryItem"
    WHERE quantity < "minQuantity" AND "minQuantity" > 0
    ORDER BY (quantity - "minQuantity") ASC
  `;

  if (lowStockItems.length === 0) {
    throw new Error("Нет товаров с низким остатком");
  }

  const orderNumber = await generateOrderNumber();

  const order = await prisma.purchaseOrder.create({
    data: {
      orderNumber,
      type: "OPERATIONAL",
      status: "DRAFT",
      supplierId,
      title: `Оперативная закупка — пополнение остатков (${new Date().toLocaleDateString("ru-RU")})`,
      description: `Автоматически сформирована на основе ${lowStockItems.length} товаров с низким остатком`,
      priority: 1,
      orderDate: new Date(),
      totalAmount: 0,
      createdById,
      items: {
        create: lowStockItems.map((item) => {
          const needQty = item.minQuantity - item.quantity;
          // Заказываем немного больше минимума для запаса
          const orderQty = Math.ceil(needQty * 1.2);
          return {
            name: item.name,
            quantity: orderQty,
            unit: item.unit,
            price: 0, // Цена будет заполнена вручную
            totalPrice: 0,
            inventoryItemId: item.id,
          };
        }),
      },
    },
  });

  return order.id;
}
