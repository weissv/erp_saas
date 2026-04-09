// src/services/InventorySyncService.ts
// Сервис синхронизации между заявками (Maintenance) и складом (Inventory)
import { prisma } from "../prisma";
import { InventoryTransactionType, Prisma } from "@prisma/client";

// Типы для ответов
export interface StockCheckResult {
  available: boolean;
  items: {
    name: string;
    unit: string;
    requested: number;
    inStock: number;
    deficit: number;
    inventoryItemId: number | null;
  }[];
}

export interface DeductionResult {
  success: boolean;
  transactions: {
    inventoryItemId: number;
    itemName: string;
    deducted: number;
    remainingStock: number;
  }[];
  warnings: string[];
}

/**
 * Проверяет наличие товаров на складе для заявки на выдачу (ISSUE).
 * Возвращает информацию о доступности каждой позиции.
 */
export async function checkStockAvailability(requestId: number): Promise<StockCheckResult> {
  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: requestId },
    include: { items: true },
  });

  if (!request || request.type !== "ISSUE") {
    return { available: true, items: [] };
  }

  const result: StockCheckResult = { available: true, items: [] };

  for (const item of request.items) {
    // Если позиция уже привязана к конкретному товару на складе
    let inventoryItem = item.inventoryItemId
      ? await prisma.inventoryItem.findUnique({ where: { id: item.inventoryItemId } })
      : null;

    // Иначе ищем по имени и единице измерения
    if (!inventoryItem) {
      inventoryItem = await prisma.inventoryItem.findFirst({
        where: {
          name: { equals: item.name, mode: "insensitive" },
          unit: { equals: item.unit, mode: "insensitive" },
        },
      });
    }

    const inStock = inventoryItem?.quantity ?? 0;
    const deficit = Math.max(item.quantity - inStock, 0);

    if (deficit > 0) {
      result.available = false;
    }

    result.items.push({
      name: item.name,
      unit: item.unit,
      requested: item.quantity,
      inStock,
      deficit,
      inventoryItemId: inventoryItem?.id ?? null,
    });
  }

  return result;
}

/**
 * Списывает товары со склада при выполнении заявки на выдачу (DONE).
 * Выполняется в транзакции Prisma для атомарности.
 * 
 * Логика:
 * - Для каждой позиции заявки ищет товар на складе
 * - Если товар найден — списывает запрошенное количество
 * - Если товара недостаточно — списывает всё что есть (частичная выдача)
 * - Создаёт запись InventoryTransaction для каждого списания
 * - Обновляет issuedQuantity в MaintenanceItem
 */
export async function deductStockForRequest(
  requestId: number,
  performedById: number
): Promise<DeductionResult> {
  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: requestId },
    include: { items: true },
  });

  if (!request || request.type !== "ISSUE") {
    return { success: true, transactions: [], warnings: ["Заявка не является заявкой на выдачу"] };
  }

  const result: DeductionResult = { success: true, transactions: [], warnings: [] };

  await prisma.$transaction(async (tx) => {
    for (const item of request.items) {
      // Ищем товар на складе
      let inventoryItem = item.inventoryItemId
        ? await tx.inventoryItem.findUnique({ where: { id: item.inventoryItemId } })
        : null;

      if (!inventoryItem) {
        inventoryItem = await tx.inventoryItem.findFirst({
          where: {
            name: { equals: item.name, mode: "insensitive" },
            unit: { equals: item.unit, mode: "insensitive" },
          },
        });
      }

      if (!inventoryItem) {
        result.warnings.push(`Товар "${item.name}" (${item.unit}) не найден на складе`);
        // Обновляем issuedQuantity = 0 для этой позиции
        await tx.maintenanceItem.update({
          where: { id: item.id },
          data: { issuedQuantity: 0, inventoryItemId: null },
        });
        continue;
      }

      const quantityBefore = inventoryItem.quantity;
      // Списываем не больше, чем есть на складе
      const actualDeduction = Math.min(item.quantity, quantityBefore);
      const quantityAfter = quantityBefore - actualDeduction;

      if (actualDeduction < item.quantity) {
        result.warnings.push(
          `Товар "${item.name}": запрошено ${item.quantity} ${item.unit}, ` +
          `на складе ${quantityBefore} ${item.unit}, выдано ${actualDeduction} ${item.unit}`
        );
      }

      // Обновляем остаток на складе
      await tx.inventoryItem.update({
        where: { id: inventoryItem.id },
        data: { quantity: quantityAfter },
      });

      // Создаём запись в журнале операций
      await tx.inventoryTransaction.create({
        data: {
          inventoryItemId: inventoryItem.id,
          type: "OUT",
          quantity: actualDeduction,
          quantityBefore,
          quantityAfter,
          reason: `Выдача по заявке #${requestId}: ${request.title}`,
          maintenanceRequestId: requestId,
          performedById,
        },
      });

      // Обновляем позицию заявки: привязка к складскому товару + фактически выданное количество
      await tx.maintenanceItem.update({
        where: { id: item.id },
        data: {
          inventoryItemId: inventoryItem.id,
          issuedQuantity: actualDeduction,
        },
      });

      result.transactions.push({
        inventoryItemId: inventoryItem.id,
        itemName: item.name,
        deducted: actualDeduction,
        remainingStock: quantityAfter,
      });
    }
  });

  return result;
}

/**
 * Возвращает товар на склад при отмене выполненной заявки.
 * Используется когда заявка переводится обратно из DONE в другой статус.
 */
export async function reverseStockForRequest(
  requestId: number,
  performedById: number
): Promise<void> {
  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: requestId },
    include: { items: true },
  });

  if (!request || request.type !== "ISSUE") return;

  await prisma.$transaction(async (tx) => {
    for (const item of request.items) {
      if (!item.inventoryItemId || !item.issuedQuantity || item.issuedQuantity <= 0) continue;

      const inventoryItem = await tx.inventoryItem.findUnique({
        where: { id: item.inventoryItemId },
      });

      if (!inventoryItem) continue;

      const quantityBefore = inventoryItem.quantity;
      const quantityAfter = quantityBefore + item.issuedQuantity;

      // Возвращаем товар на склад
      await tx.inventoryItem.update({
        where: { id: inventoryItem.id },
        data: { quantity: quantityAfter },
      });

      // Фиксируем возврат в журнале
      await tx.inventoryTransaction.create({
        data: {
          inventoryItemId: inventoryItem.id,
          type: "IN",
          quantity: item.issuedQuantity,
          quantityBefore,
          quantityAfter,
          reason: `Возврат по заявке #${requestId}: ${request.title} (отмена выполнения)`,
          maintenanceRequestId: requestId,
          performedById,
        },
      });

      // Сбрасываем issuedQuantity
      await tx.maintenanceItem.update({
        where: { id: item.id },
        data: { issuedQuantity: null },
      });
    }
  });
}

/**
 * Создаёт транзакцию прихода при добавлении товара на склад.
 */
export async function createIncomingTransaction(
  inventoryItemId: number,
  quantity: number,
  performedById?: number,
  reason?: string
): Promise<void> {
  await prisma.inventoryTransaction.create({
    data: {
      inventoryItemId,
      type: "IN",
      quantity,
      quantityBefore: 0,
      quantityAfter: quantity,
      reason: reason || "Первичное добавление на склад",
      performedById: performedById || null,
    },
  });
}

/**
 * Создаёт транзакцию корректировки при ручном изменении количества.
 */
export async function createAdjustmentTransaction(
  inventoryItemId: number,
  oldQuantity: number,
  newQuantity: number,
  performedById?: number,
  reason?: string
): Promise<void> {
  const diff = newQuantity - oldQuantity;
  if (diff === 0) return;

  await prisma.inventoryTransaction.create({
    data: {
      inventoryItemId,
      type: diff > 0 ? "IN" : "ADJUSTMENT",
      quantity: Math.abs(diff),
      quantityBefore: oldQuantity,
      quantityAfter: newQuantity,
      reason: reason || `Ручная корректировка: ${oldQuantity} → ${newQuantity}`,
      performedById: performedById || null,
    },
  });
}

/**
 * Создаёт транзакцию списания (например, при удалении товара или просрочке).
 */
export async function createWriteOffTransaction(
  inventoryItemId: number,
  quantity: number,
  quantityBefore: number,
  performedById?: number,
  reason?: string
): Promise<void> {
  await prisma.inventoryTransaction.create({
    data: {
      inventoryItemId,
      type: "WRITE_OFF",
      quantity,
      quantityBefore,
      quantityAfter: quantityBefore - quantity,
      reason: reason || "Списание",
      performedById: performedById || null,
    },
  });
}

/**
 * Получает историю движений по конкретному товару.
 */
export async function getItemTransactions(inventoryItemId: number, limit = 50) {
  return prisma.inventoryTransaction.findMany({
    where: { inventoryItemId },
    include: {
      maintenanceRequest: {
        select: { id: true, title: true, type: true },
      },
      performedBy: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * Получает все транзакции с фильтрацией.
 */
export async function getTransactions(filters?: {
  type?: InventoryTransactionType;
  startDate?: Date;
  endDate?: Date;
  inventoryItemId?: number;
  maintenanceRequestId?: number;
  limit?: number;
}) {
  const where: Prisma.InventoryTransactionWhereInput = {};

  if (filters?.type) where.type = filters.type;
  if (filters?.inventoryItemId) where.inventoryItemId = filters.inventoryItemId;
  if (filters?.maintenanceRequestId) where.maintenanceRequestId = filters.maintenanceRequestId;
  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {};
    if (filters?.startDate) where.createdAt.gte = filters.startDate;
    if (filters?.endDate) where.createdAt.lte = filters.endDate;
  }

  return prisma.inventoryTransaction.findMany({
    where,
    include: {
      inventoryItem: {
        select: { id: true, name: true, unit: true, type: true },
      },
      maintenanceRequest: {
        select: { id: true, title: true, type: true },
      },
      performedBy: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: filters?.limit || 100,
  });
}

/**
 * Получает товары с низким остатком (ниже minQuantity).
 */
export async function getLowStockItems() {
  // Prisma не поддерживает сравнение колонок напрямую, используем raw query
  const items = await prisma.$queryRaw`
    SELECT * FROM "InventoryItem" 
    WHERE "quantity" <= "minQuantity" AND "minQuantity" > 0
    ORDER BY ("quantity" - "minQuantity") ASC
  `;
  return items;
}
