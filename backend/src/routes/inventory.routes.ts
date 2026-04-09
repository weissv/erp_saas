// src/routes/inventory.routes.ts
import { Router } from "express";
import { prisma } from "../prisma";
import { checkRole } from "../middleware/checkRole";
import { validate } from "../middleware/validate";
import { listInventorySchema, generateShoppingListSchema, createInventorySchema, updateInventorySchema } from "../schemas/inventory.schema";
import {
  createIncomingTransaction,
  createAdjustmentTransaction,
  createWriteOffTransaction,
  getItemTransactions,
  getTransactions,
  getLowStockItems,
} from "../services/InventorySyncService";
import { InventoryTransactionType } from "@prisma/client";
const router = Router();

// GET /api/inventory/search - поиск товаров для автозаполнения
// ВАЖНО: этот маршрут должен быть ДО /:id, чтобы не конфликтовать
router.get("/search", checkRole(["DIRECTOR", "DEPUTY", "ADMIN", "ZAVHOZ", "TEACHER"]), async (req, res) => {
  const query = (req.query.q as string) || "";
  if (!query || query.trim().length < 1) {
    return res.json([]);
  }
  
  const items = await prisma.inventoryItem.findMany({
    where: {
      name: {
        contains: query.trim(),
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      name: true,
      unit: true,
      quantity: true, // Добавляем остаток для отображения при выборе
      type: true,
    },
    take: 10,
    orderBy: { name: "asc" },
  });
  
  return res.json(items);
});

// GET /api/inventory/transactions - журнал движений склада
router.get("/transactions", checkRole(["DIRECTOR", "DEPUTY", "ADMIN", "ZAVHOZ"]), async (req, res) => {
  const { type, itemId, startDate, endDate, limit } = req.query;
  
  const transactions = await getTransactions({
    type: type as InventoryTransactionType | undefined,
    inventoryItemId: itemId ? Number(itemId) : undefined,
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
    limit: limit ? Number(limit) : 100,
  });
  
  return res.json(transactions);
});

// GET /api/inventory/low-stock - товары с низким остатком
router.get("/low-stock", checkRole(["DIRECTOR", "DEPUTY", "ADMIN", "ZAVHOZ"]), async (_req, res) => {
  const items = await getLowStockItems();
  return res.json(items);
});

// GET /api/inventory
router.get("/", checkRole(["DIRECTOR", "DEPUTY", "ADMIN", "ZAVHOZ"]), async (_req, res) => {
  const items = await prisma.inventoryItem.findMany({ orderBy: { name: "asc" } });
  return res.json(items);
});

// GET /api/inventory/:id/transactions - история движений конкретного товара
router.get("/:id/transactions", checkRole(["DIRECTOR", "DEPUTY", "ADMIN", "ZAVHOZ"]), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "Invalid id" });
  }
  const transactions = await getItemTransactions(id);
  return res.json(transactions);
});

// POST /api/inventory - создание товара (с записью транзакции прихода)
router.post("/", checkRole(["DIRECTOR", "ADMIN", "ZAVHOZ"]), validate(createInventorySchema), async (req, res) => {
  const { name, quantity, unit, expiryDate, type, minQuantity } = req.body;
  const user = req.user;
  
  const item = await prisma.inventoryItem.create({
    data: {
      name,
      quantity,
      unit,
      minQuantity: minQuantity ?? 0,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      type: type || "FOOD",
    },
  });

  // Создаём транзакцию прихода
  if (quantity > 0) {
    await createIncomingTransaction(
      item.id,
      quantity,
      user?.employeeId,
      "Первичное добавление на склад"
    );
  }

  return res.status(201).json(item);
});

// PUT /api/inventory/:id - обновление товара (с записью транзакции корректировки)
router.put("/:id", checkRole(["DIRECTOR", "ADMIN", "ZAVHOZ"]), validate(updateInventorySchema), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "Invalid id" });
  }
  const { name, quantity, unit, expiryDate, type, minQuantity } = req.body;
  const user = req.user;

  // Получаем текущее количество для записи транзакции
  const currentItem = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!currentItem) {
    return res.status(404).json({ message: "Товар не найден" });
  }

  const item = await prisma.inventoryItem.update({
    where: { id },
    data: {
      name,
      quantity,
      unit,
      minQuantity,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      type,
    },
  });

  // Если количество изменилось — создаём транзакцию корректировки
  if (quantity !== undefined && quantity !== currentItem.quantity) {
    await createAdjustmentTransaction(
      id,
      currentItem.quantity,
      quantity,
      user?.employeeId,
      `Ручная корректировка: ${currentItem.quantity} → ${quantity}`
    );
  }

  return res.json(item);
});

// POST /api/inventory/:id/write-off - списание товара
router.post("/:id/write-off", checkRole(["DIRECTOR", "ADMIN", "ZAVHOZ"]), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "Invalid id" });
  }
  const { quantity, reason } = req.body;
  const user = req.user;

  if (!quantity || quantity <= 0) {
    return res.status(400).json({ message: "Количество списания должно быть положительным" });
  }

  const currentItem = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!currentItem) {
    return res.status(404).json({ message: "Товар не найден" });
  }

  if (quantity > currentItem.quantity) {
    return res.status(400).json({ message: `Недостаточно на складе. Остаток: ${currentItem.quantity} ${currentItem.unit}` });
  }

  const newQuantity = currentItem.quantity - quantity;

  const updated = await prisma.inventoryItem.update({
    where: { id },
    data: { quantity: newQuantity },
  });

  await createWriteOffTransaction(
    id,
    quantity,
    currentItem.quantity,
    user?.employeeId,
    reason || "Списание"
  );

  return res.json(updated);
});

// POST /api/inventory/:id/receive - приёмка товара (приход)
router.post("/:id/receive", checkRole(["DIRECTOR", "ADMIN", "ZAVHOZ"]), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "Invalid id" });
  }
  const { quantity, reason } = req.body;
  const user = req.user;

  if (!quantity || quantity <= 0) {
    return res.status(400).json({ message: "Количество прихода должно быть положительным" });
  }

  const currentItem = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!currentItem) {
    return res.status(404).json({ message: "Товар не найден" });
  }

  const newQuantity = currentItem.quantity + quantity;

  const updated = await prisma.inventoryItem.update({
    where: { id },
    data: { quantity: newQuantity },
  });

  await createIncomingTransaction(
    id,
    quantity,
    user?.employeeId,
    reason || "Приёмка товара"
  );

  // Обновляем quantityBefore/After в последней транзакции (createIncomingTransaction ставит 0/quantity)
  const lastTx = await prisma.inventoryTransaction.findFirst({
    where: { inventoryItemId: id },
    orderBy: { createdAt: "desc" },
  });
  if (lastTx) {
    await prisma.inventoryTransaction.update({
      where: { id: lastTx.id },
      data: {
        quantityBefore: currentItem.quantity,
        quantityAfter: newQuantity,
      },
    });
  }

  return res.json(updated);
});

// DELETE /api/inventory/:id - удаление товара со склада (с записью списания)
router.delete("/:id", checkRole(["DIRECTOR", "ADMIN", "ZAVHOZ"]), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "Invalid id" });
  }
  
  const user = req.user;

  try {
    const currentItem = await prisma.inventoryItem.findUnique({ where: { id } });
    if (currentItem && currentItem.quantity > 0) {
      // Записываем списание перед удалением
      await createWriteOffTransaction(
        id,
        currentItem.quantity,
        currentItem.quantity,
        user?.employeeId,
        "Удаление товара со склада"
      );
    }
    
    // Удаляем связанные транзакции и сам товар
    await prisma.inventoryTransaction.deleteMany({ where: { inventoryItemId: id } });
    await prisma.inventoryItem.delete({ where: { id } });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return res.status(204).send();
    }
    throw error;
  }
  return res.status(204).send();
});

// POST /api/inventory/generate-shopping-list
// TODO: Cron job для проверки сроков годности и создания уведомлений.
router.post("/generate-shopping-list", checkRole(["DIRECTOR", "DEPUTY", "ADMIN", "ZAVHOZ"]), validate(generateShoppingListSchema), async (req, res) => {
  // Вход: { startDate, endDate }
  // Бизнес-логика: суммировать блюда из меню через MenuDish -> Dish -> DishIngredient -> Ingredient, сопоставить с остатками
  const { startDate, endDate } = req.body as { startDate: string; endDate: string };
  const menus = await prisma.menu.findMany({
    where: { date: { gte: new Date(startDate), lte: new Date(endDate) } },
    include: {
      meals: {
        include: {
          dish: {
            include: {
              ingredients: {
                include: {
                  ingredient: true
                }
              }
            }
          }
        }
      }
    }
  });

  // Суммируем требуемые ингредиенты из всех блюд
  const required: Record<string, { qty: number; unit: string }> = {};
  for (const menu of menus) {
    for (const menuDish of menu.meals) {
      const dish = menuDish.dish;
      for (const dishIng of dish.ingredients) {
        const ing = dishIng.ingredient;
        const key = `${ing.name}|${ing.unit}`;
        required[key] = required[key] || { qty: 0, unit: ing.unit };
        required[key].qty += dishIng.quantity;
      }
    }
  }

  const inventory = await prisma.inventoryItem.findMany({
    include: { ingredient: true }
  });
  
  const shoppingList = Object.entries(required).map(([key, val]) => {
    const [name, unit] = key.split("|");
    // Находим товар на складе по имени и единице измерения
    // Проверяем как по связанному ингредиенту, так и по имени самого товара
    const stock = inventory.find((i) => 
      (i.ingredient?.name === name && i.ingredient?.unit === unit) || 
      (i.name === name && i.unit === unit)
    );
    const remaining = (val.qty - (stock?.quantity || 0));
    return { name, unit, requiredQty: val.qty, inStock: stock?.quantity || 0, toBuy: Math.max(remaining, 0) };
  });

  return res.json({ data: { period: { startDate, endDate }, items: shoppingList } });
});
export default router;
