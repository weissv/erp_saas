// src/routes/menu.routes.ts
import { Router } from "express";
import { prisma } from "../prisma";
import { checkRole } from "../middleware/checkRole";
import { validate } from "../middleware/validate";
import { getMenuSchema, upsertMenuSchema } from "../schemas/menu.schema";

const router = Router();

// GET /api/menu?startDate&endDate
router.get("/", checkRole(["DEPUTY", "ADMIN", "ZAVHOZ"]), validate(getMenuSchema), async (req, res) => {
  const { startDate, endDate } = req.query as any;
  const where: any = {};
  if (startDate || endDate) where.date = {};
  if (startDate) where.date.gte = new Date(String(startDate));
  if (endDate) where.date.lte = new Date(String(endDate));
  const items = await prisma.menu.findMany({ 
    where, 
    orderBy: { date: "asc" },
    include: {
      meals: {
        include: {
          dish: true
        }
      }
    }
  });
  return res.json({ data: { items } });
});

// POST /api/menu
router.post("/", checkRole(["DEPUTY", "ADMIN", "ZAVHOZ"]), validate(upsertMenuSchema), async (req, res) => {
  // Валидация и расчёт КБЖУ можно делать на фронте и/или бэке
  const created = await prisma.menu.upsert({
    where: { date_ageGroup: { date: new Date(req.body.date), ageGroup: req.body.ageGroup } },
    update: { meals: req.body.meals },
    create: { date: new Date(req.body.date), ageGroup: req.body.ageGroup, meals: req.body.meals },
  });
  return res.status(201).json(created);
});

// POST /api/menu/:id/calculate-kbju - рассчитать КБЖУ для меню
router.post("/:id/calculate-kbju", checkRole(["DEPUTY", "ADMIN", "ZAVHOZ"]), async (req, res) => {
  const { id } = req.params;
  
  const menu = await prisma.menu.findUnique({
    where: { id: Number(id) },
    include: {
      meals: {
        include: {
          dish: {
            include: {
              ingredients: {
                include: {
                  ingredient: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!menu) {
    return res.status(404).json({ error: "Menu not found" });
  }

  // Суммируем КБЖУ всех блюд в меню
  let totalCalories = 0;
  let totalProtein = 0;
  let totalFat = 0;
  let totalCarbs = 0;

  for (const menuDish of menu.meals) {
    for (const dishIng of menuDish.dish.ingredients) {
      const ing = dishIng.ingredient;
      totalCalories += ing.calories * dishIng.quantity;
      totalProtein += ing.protein * dishIng.quantity;
      totalFat += ing.fat * dishIng.quantity;
      totalCarbs += ing.carbs * dishIng.quantity;
    }
  }

  return res.json({
    menuId: menu.id,
    date: menu.date,
    ageGroup: menu.ageGroup,
    kbju: {
      calories: Math.round(totalCalories),
      protein: Math.round(totalProtein * 10) / 10,
      fat: Math.round(totalFat * 10) / 10,
      carbs: Math.round(totalCarbs * 10) / 10,
    },
  });
});

// DELETE /api/menu/:id - удалить меню
router.delete("/:id", checkRole(["ADMIN", "ZAVHOZ"]), async (req, res) => {
  const { id } = req.params;
  
  await prisma.menu.delete({
    where: { id: Number(id) },
  });
  
  return res.status(204).send();
});

// GET /api/menu/:id/shopping-list - список покупок для меню
router.get("/:id/shopping-list", checkRole(["DEPUTY", "ADMIN", "ZAVHOZ"]), async (req, res) => {
  const { id } = req.params;
  const { portions } = req.query; // количество порций
  
  const menu = await prisma.menu.findUnique({
    where: { id: Number(id) },
    include: {
      meals: {
        include: {
          dish: {
            include: {
              ingredients: {
                include: {
                  ingredient: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!menu) {
    return res.status(404).json({ error: "Menu not found" });
  }

  const portionsCount = Number(portions) || 1;

  // Собираем требуемые ингредиенты
  const required: Record<string, { qty: number; unit: string; ingredientId: number }> = {};
  
  for (const menuDish of menu.meals) {
    for (const dishIng of menuDish.dish.ingredients) {
      const ing = dishIng.ingredient;
      const key = `${ing.name}|${ing.unit}`;
      
      if (!required[key]) {
        required[key] = { qty: 0, unit: ing.unit, ingredientId: ing.id };
      }
      required[key].qty += dishIng.quantity * portionsCount;
    }
  }

  // Получаем текущие остатки
  const inventory = await prisma.inventoryItem.findMany({
    include: { ingredient: true },
  });

  const shoppingList = Object.entries(required).map(([key, val]) => {
    const [name] = key.split("|");
    const stock = inventory.find((i: any) => i.ingredient?.id === val.ingredientId);
    const inStock = stock?.quantity || 0;
    const toBuy = Math.max(val.qty - inStock, 0);
    
    return {
      ingredientName: name,
      unit: val.unit,
      requiredQty: Math.round(val.qty * 10) / 10,
      inStock: Math.round(inStock * 10) / 10,
      toBuy: Math.round(toBuy * 10) / 10,
    };
  });

  return res.json({
    menuId: menu.id,
    date: menu.date,
    ageGroup: menu.ageGroup,
    portions: portionsCount,
    items: shoppingList,
  });
});

export default router;
