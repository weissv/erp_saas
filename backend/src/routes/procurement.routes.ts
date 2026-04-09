// src/routes/procurement.routes.ts
import { Router } from "express";
import { prisma } from "../prisma";
import { checkRole } from "../middleware/checkRole";
import { validate } from "../middleware/validate";
import {
  createOrderSchema,
  updateOrderSchema,
  rejectOrderSchema,
  receiveOrderSchema,
  createSupplierSchema,
  updateSupplierSchema,
} from "../schemas/procurement.schema";
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  submitForApproval,
  approveOrder,
  rejectOrder,
  markAsOrdered,
  markAsDelivered,
  receiveOrder,
  cancelOrder,
  getProcurementStats,
  generateOrderFromLowStock,
} from "../services/ProcurementService";
import { notifyRole, sendTelegramMessage } from "../services/TelegramService";

const router = Router();

// =====================================================
// ЗАКАЗЫ НА ЗАКУПКУ
// =====================================================

// GET /api/procurement/orders - Получить все заказы (с фильтрами)
router.get("/orders", checkRole(["DEVELOPER", "DIRECTOR", "DEPUTY", "ADMIN", "ACCOUNTANT", "ZAVHOZ"]), async (req, res) => {
  try {
    const { status, type, supplierId, startDate, endDate, search } = req.query;
    
    const orders = await getOrders({
      status: status as any,
      type: type as any,
      supplierId: supplierId ? Number(supplierId) : undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      search: search as string,
    });

    return res.json(orders);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

// GET /api/procurement/orders/stats - Статистика закупок
router.get("/orders/stats", checkRole(["DEVELOPER", "DIRECTOR", "DEPUTY", "ADMIN", "ACCOUNTANT"]), async (_req, res) => {
  try {
    const stats = await getProcurementStats();
    return res.json(stats);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

// GET /api/procurement/orders/:id - Получить детали заказа
router.get("/orders/:id", checkRole(["DEVELOPER", "DIRECTOR", "DEPUTY", "ADMIN", "ACCOUNTANT", "ZAVHOZ"]), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid id" });

    const order = await getOrderById(id);
    if (!order) return res.status(404).json({ message: "Заказ не найден" });

    return res.json(order);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

// POST /api/procurement/orders - Создать заказ на закупку
router.post("/orders", checkRole(["DEVELOPER", "DIRECTOR", "DEPUTY", "ADMIN", "ZAVHOZ"]), validate(createOrderSchema), async (req, res) => {
  try {
    const user = req.user!;
    const { type, supplierId, title, description, priority, orderDate, expectedDeliveryDate, budgetSource, items } = req.body;
    const resolvedOrderDate = orderDate ? new Date(orderDate) : new Date();

    const order = await createOrder(
      {
        type,
        supplierId,
        title,
        description,
        priority,
        orderDate: resolvedOrderDate,
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : undefined,
        budgetSource,
        items,
      },
      user.employeeId
    );

    return res.status(201).json(order);
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
});

// PUT /api/procurement/orders/:id - Обновить заказ (только DRAFT/REJECTED)
router.put("/orders/:id", checkRole(["DEVELOPER", "DIRECTOR", "DEPUTY", "ADMIN", "ZAVHOZ"]), validate(updateOrderSchema), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid id" });

    const { supplierId, title, description, priority, expectedDeliveryDate, budgetSource, items } = req.body;

    const order = await updateOrder(id, {
      supplierId,
      title,
      description,
      priority,
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : undefined,
      budgetSource,
      items,
    });

    return res.json(order);
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
});

// DELETE /api/procurement/orders/:id - Удалить заказ (только DRAFT/CANCELLED)
router.delete("/orders/:id", checkRole(["DEVELOPER", "DIRECTOR", "ADMIN"]), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid id" });

    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!order) return res.status(404).json({ message: "Заказ не найден" });
    if (order.status !== "DRAFT" && order.status !== "CANCELLED") {
      return res.status(400).json({ message: "Удалить можно только черновик или отменённый заказ" });
    }

    await prisma.purchaseOrder.delete({ where: { id } });
    return res.status(204).send();
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

// =====================================================
// WORKFLOW ACTIONS
// =====================================================

// POST /api/procurement/orders/:id/submit - Отправить на одобрение
router.post("/orders/:id/submit", checkRole(["DEVELOPER", "DIRECTOR", "DEPUTY", "ADMIN", "ZAVHOZ"]), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid id" });

    const order = await submitForApproval(id);

    // Уведомляем директора о новой заявке на одобрение
    try {
      const typeLabel = order.type === "OPERATIONAL" ? "🔴 ОПЕРАТИВНАЯ" : "📋 Плановая";
      await notifyRole(
        "DIRECTOR",
        `📦 <b>Новая заявка на закупку!</b>\n\n` +
        `${typeLabel}\n` +
        `🔢 №: ${order.orderNumber}\n` +
        `📝 Тема: ${order.title}\n` +
        `💰 Сумма: ${order.totalAmount}\n` +
        `👤 Создал: ${order.createdBy.firstName} ${order.createdBy.lastName}\n\n` +
        `Требуется ваше одобрение.`
      );
    } catch (e) {
      console.error("Telegram notification error:", e);
    }

    return res.json(order);
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
});

// POST /api/procurement/orders/:id/approve - Одобрить (только DIRECTOR, DEPUTY)
router.post("/orders/:id/approve", checkRole(["DEVELOPER", "DIRECTOR", "DEPUTY"]), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid id" });

    const user = req.user!;
    const order = await approveOrder(id, user.employeeId);

    // Уведомляем создателя
    try {
      const creatorUser = await prisma.user.findUnique({
        where: { employeeId: order.createdBy.id },
        select: { id: true },
      });
      if (creatorUser) {
        await sendTelegramMessage(
          creatorUser.id,
          `✅ <b>Закупка одобрена!</b>\n\n` +
          `🔢 №: ${order.orderNumber}\n` +
          `📝 ${order.title}\n` +
          `👤 Одобрил: ${order.approvedBy?.firstName} ${order.approvedBy?.lastName}\n\n` +
          `Можно оформлять заказ у поставщика.`
        );
      }
    } catch (e) {
      console.error("Telegram notification error:", e);
    }

    return res.json(order);
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
});

// POST /api/procurement/orders/:id/reject - Отклонить (только DIRECTOR, DEPUTY)
router.post("/orders/:id/reject", checkRole(["DEVELOPER", "DIRECTOR", "DEPUTY"]), validate(rejectOrderSchema), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid id" });

    const user = req.user!;
    const { reason } = req.body;
    const order = await rejectOrder(id, user.employeeId, reason);

    // Уведомляем создателя
    try {
      const creatorUser = await prisma.user.findUnique({
        where: { employeeId: order.createdBy.id },
        select: { id: true },
      });
      if (creatorUser) {
        await sendTelegramMessage(
          creatorUser.id,
          `❌ <b>Закупка отклонена!</b>\n\n` +
          `🔢 №: ${order.orderNumber}\n` +
          `📝 ${order.title}\n` +
          `❓ Причина: ${reason}\n\n` +
          `Вы можете отредактировать и отправить повторно.`
        );
      }
    } catch (e) {
      console.error("Telegram notification error:", e);
    }

    return res.json(order);
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
});

// POST /api/procurement/orders/:id/order - Отметить "Заказано у поставщика"
router.post("/orders/:id/order", checkRole(["DEVELOPER", "DIRECTOR", "DEPUTY", "ADMIN", "ZAVHOZ"]), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid id" });

    const order = await markAsOrdered(id);
    return res.json(order);
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
});

// POST /api/procurement/orders/:id/deliver - Отметить "Доставлено"
router.post("/orders/:id/deliver", checkRole(["DEVELOPER", "DIRECTOR", "DEPUTY", "ADMIN", "ZAVHOZ"]), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid id" });

    const { actualDeliveryDate } = req.body;
    const order = await markAsDelivered(id, actualDeliveryDate ? new Date(actualDeliveryDate) : undefined);
    return res.json(order);
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
});

// POST /api/procurement/orders/:id/receive - Приёмка на склад
router.post("/orders/:id/receive", checkRole(["DEVELOPER", "DIRECTOR", "ADMIN", "ZAVHOZ"]), validate(receiveOrderSchema), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid id" });

    const user = req.user!;
    const { receiveNote, items } = req.body;

    const result = await receiveOrder(id, user.employeeId, receiveNote, items);

    // Уведомляем директора о приёмке на склад
    try {
      const itemsSummary = result.receivedItems
        .map((i) => `  • ${i.itemName}: ${i.received} шт`)
        .join("\n");
      await notifyRole(
        "DIRECTOR",
        `📦 <b>Товар принят на склад!</b>\n\n` +
        `🔢 Заказ: ${id}\n` +
        `📋 Позиции:\n${itemsSummary}\n` +
        (result.warnings.length > 0
          ? `\n⚠️ <b>Предупреждения:</b>\n${result.warnings.map((w) => `  • ${w}`).join("\n")}`
          : "")
      );
    } catch (e) {
      console.error("Telegram notification error:", e);
    }

    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
});

// POST /api/procurement/orders/:id/cancel - Отменить заказ
router.post("/orders/:id/cancel", checkRole(["DEVELOPER", "DIRECTOR", "DEPUTY", "ADMIN"]), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid id" });

    const { reason } = req.body;
    const order = await cancelOrder(id, reason);
    return res.json(order);
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
});

// POST /api/procurement/orders/generate-from-low-stock - Сформировать закупку по низким остаткам
router.post("/orders/generate-from-low-stock", checkRole(["DEVELOPER", "DIRECTOR", "ADMIN", "ZAVHOZ"]), async (req, res) => {
  try {
    const { supplierId } = req.body;
    const user = req.user!;

    if (!supplierId) {
      return res.status(400).json({ message: "Укажите поставщика" });
    }

    const orderId = await generateOrderFromLowStock(supplierId, user.employeeId);
    const order = await getOrderById(orderId);
    return res.status(201).json(order);
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
});

// =====================================================
// ПОСТАВЩИКИ
// =====================================================

// GET /api/procurement/suppliers - Список поставщиков
router.get("/suppliers", checkRole(["DEVELOPER", "DIRECTOR", "DEPUTY", "ADMIN", "ACCOUNTANT", "ZAVHOZ"]), async (req, res) => {
  const { active } = req.query;
  
  const suppliers = await prisma.supplier.findMany({
    where: active === "true" ? { isActive: true } : {},
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { orders: true },
      },
    },
  });

  return res.json(suppliers);
});

// GET /api/procurement/suppliers/:id - Детали поставщика
router.get("/suppliers/:id", checkRole(["DEVELOPER", "DIRECTOR", "DEPUTY", "ADMIN", "ACCOUNTANT", "ZAVHOZ"]), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid id" });

  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          orderNumber: true,
          title: true,
          status: true,
          totalAmount: true,
          orderDate: true,
        },
      },
      _count: { select: { orders: true } },
    },
  });

  if (!supplier) return res.status(404).json({ message: "Поставщик не найден" });
  return res.json(supplier);
});

// POST /api/procurement/suppliers - Создать поставщика
router.post("/suppliers", checkRole(["DEVELOPER", "DIRECTOR", "ADMIN", "ZAVHOZ"]), validate(createSupplierSchema), async (req, res) => {
  const { name, contactInfo, phone, email, address, inn } = req.body;

  const supplier = await prisma.supplier.create({
    data: {
      name,
      contactInfo: contactInfo || null,
      phone: phone || null,
      email: email || null,
      address: address || null,
      inn: inn || null,
    },
  });

  return res.status(201).json(supplier);
});

// PUT /api/procurement/suppliers/:id - Обновить поставщика
router.put("/suppliers/:id", checkRole(["DEVELOPER", "DIRECTOR", "ADMIN", "ZAVHOZ"]), validate(updateSupplierSchema), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid id" });

  const { name, contactInfo, phone, email, address, inn, isActive } = req.body;

  const supplier = await prisma.supplier.update({
    where: { id },
    data: {
      name,
      contactInfo,
      phone,
      email,
      address,
      inn,
      isActive,
    },
  });

  return res.json(supplier);
});

// DELETE /api/procurement/suppliers/:id - Удалить поставщика
router.delete("/suppliers/:id", checkRole(["DEVELOPER", "DIRECTOR", "ADMIN"]), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid id" });

  try {
    await prisma.supplier.delete({ where: { id } });
    return res.status(204).send();
  } catch (error: any) {
    if (error?.code === "P2003") {
      return res.status(400).json({ message: "Нельзя удалить поставщика с существующими заказами" });
    }
    return res.status(500).json({ message: error.message });
  }
});

// =====================================================
// ИМПОРТИРОВАННЫЕ НАКЛАДНЫЕ ИЗ 1С (только INCOMING)
// =====================================================

// GET /api/procurement/invoices — поступления от поставщиков (из 1С)
router.get(
  "/invoices",
  checkRole(["ACCOUNTANT", "DEPUTY", "ADMIN", "ZAVHOZ"]),
  async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? req.query.limit) || 20));
    const skip = (page - 1) * pageSize;

    const where: any = { direction: "INCOMING" as const };

    if (req.query.contractorId) {
      where.contractorId = Number(req.query.contractorId);
    }
    if (req.query.posted === "true" || req.query.posted === "false") {
      where.posted = req.query.posted === "true";
    }
    if (req.query.startDate || req.query.endDate) {
      where.date = {};
      if (req.query.startDate) where.date.gte = new Date(String(req.query.startDate));
      if (req.query.endDate) where.date.lte = new Date(String(req.query.endDate));
    }

    const [items, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { date: "desc" },
        include: {
          contractor: { select: { id: true, name: true, inn: true } },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return res.json({
      items,
      total,
      page,
      pageSize,
      totalPages,
      limit: pageSize,
      pages: totalPages,
    });
  }
);

export default router;
