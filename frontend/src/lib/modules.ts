import type { UserRole } from "../types/auth";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  UserCog,
  CalendarDays,
  ClipboardCheck,
  ListOrdered,
  UserPlus,
  GraduationCap,
  Palette,
  CheckSquare,
  Wallet,
  Package,
  UtensilsCrossed,
  CookingPot,
  ShoppingCart,
  Wrench,
  Shield,
  FileText,
  Calendar,
  MessageSquare,
  ArrowLeftRight,
  Database,
  ScrollText,
  Bell,
  Bot,
  BookOpen,
} from "lucide-react";

export type ModuleLink = {
  path: string;
  label: string;
  roles: UserRole[];
  icon?: LucideIcon;
  allowedUsers?: string[]; // Если указано, модуль доступен только этим пользователям (по email/login)
  isExternal?: boolean; // Внешняя ссылка (открывается в новой вкладке/отдельном приложении)
};

export type ModuleGroup = {
  id: string;
  label: string;
  paths: string[];
};

// Роли с полным доступом ко всем модулям (экспорт для использования в других местах)
export const FULL_ACCESS_ROLES: UserRole[] = ["DEVELOPER", "DIRECTOR"];

// Все роли для модулей с полным доступом
const ALL_ROLES: UserRole[] = ["DEVELOPER", "DIRECTOR", "DEPUTY", "ADMIN", "ACCOUNTANT", "TEACHER", "ZAVHOZ"];

export const MODULE_LINKS: ModuleLink[] = [
  { path: "/dashboard", label: "Дашборд", icon: LayoutDashboard, roles: ALL_ROLES },
  { path: "/children", label: "Дети", icon: Users, roles: [...FULL_ACCESS_ROLES, "ADMIN"] },
  { path: "/employees", label: "Сотрудники", icon: UserCog, roles: [...FULL_ACCESS_ROLES, "ADMIN"] },
  { path: "/schedule", label: "Расписание", icon: CalendarDays, roles: [...FULL_ACCESS_ROLES, "ADMIN", "TEACHER"] },
  { path: "/exams", label: "Контрольные", icon: ClipboardCheck, roles: [...FULL_ACCESS_ROLES, "DEPUTY", "ADMIN", "TEACHER"] },
  { path: "/staffing", label: "Штатное расписание", icon: ListOrdered, roles: FULL_ACCESS_ROLES },
  { path: "/users", label: "Пользователи", icon: UserPlus, roles: [...FULL_ACCESS_ROLES, "ADMIN"] },
  { path: "/groups", label: "Классы", icon: GraduationCap, roles: [...FULL_ACCESS_ROLES, "ADMIN"] },
  { path: "/clubs", label: "Кружки", icon: Palette, roles: [...FULL_ACCESS_ROLES, "ADMIN", "ACCOUNTANT", "TEACHER"] },
  { path: "/attendance", label: "Посещаемость", icon: CheckSquare, roles: [...FULL_ACCESS_ROLES, "ADMIN", "TEACHER"] },
  { path: "/finance", label: "Финансы", icon: Wallet, roles: [...FULL_ACCESS_ROLES, "ADMIN", "ACCOUNTANT"] },
  { path: "/inventory", label: "Склад", icon: Package, roles: [...FULL_ACCESS_ROLES, "ADMIN", "ZAVHOZ"] },
  { path: "/menu", label: "Меню", icon: UtensilsCrossed, roles: [...FULL_ACCESS_ROLES, "ADMIN", "ZAVHOZ"] },
  { path: "/recipes", label: "Рецепты", icon: CookingPot, roles: [...FULL_ACCESS_ROLES, "ADMIN", "ZAVHOZ"] },
  { path: "/procurement", label: "Закупки", icon: ShoppingCart, roles: [...FULL_ACCESS_ROLES, "ADMIN", "ACCOUNTANT", "ZAVHOZ"] },
  { path: "/maintenance", label: "Заявки", icon: Wrench, roles: [...FULL_ACCESS_ROLES, "ADMIN", "ZAVHOZ"] },
  { path: "/security", label: "Безопасность", icon: Shield, roles: [...FULL_ACCESS_ROLES, "ADMIN", "ZAVHOZ"] },
  { path: "/documents", label: "Документы", icon: FileText, roles: [...FULL_ACCESS_ROLES, "ADMIN"] },
  { path: "/calendar", label: "Календарь", icon: Calendar, roles: [...FULL_ACCESS_ROLES, "ADMIN", "ZAVHOZ"] },
  { path: "/feedback", label: "Заявки и баг-репорты", icon: MessageSquare, roles: ALL_ROLES },
  { path: "/integration", label: "Импорт/Экспорт", icon: ArrowLeftRight, roles: [...FULL_ACCESS_ROLES, "ADMIN", "ACCOUNTANT"] },
  { path: "/onec-data", label: "Данные 1С", icon: Database, roles: [...FULL_ACCESS_ROLES, "ADMIN", "ACCOUNTANT"] },
  { path: "/action-log", label: "Журнал действий", icon: ScrollText, roles: [...FULL_ACCESS_ROLES, "ADMIN"] },
  { path: "/notifications", label: "Уведомления", icon: Bell, roles: [...FULL_ACCESS_ROLES, "ADMIN"] },
  { path: "/ai-assistant", label: "ИИ-Методист", icon: Bot, roles: [...FULL_ACCESS_ROLES, "ADMIN", "TEACHER"] },
  { path: "/knowledge-base", label: "База знаний", icon: BookOpen, roles: ALL_ROLES },
];

export const ERP_NAV_GROUPS: ModuleGroup[] = [
  {
    id: "overview",
    label: "Обзор",
    paths: ["/dashboard", "/schedule", "/calendar", "/notifications", "/feedback"],
  },
  {
    id: "people",
    label: "Люди и обучение",
    paths: ["/children", "/employees", "/groups", "/clubs", "/attendance", "/exams", "/staffing"],
  },
  {
    id: "operations",
    label: "Операции",
    paths: ["/finance", "/inventory", "/menu", "/recipes", "/procurement", "/maintenance", "/documents"],
  },
  {
    id: "platform",
    label: "Платформа",
    paths: ["/users", "/security", "/integration", "/onec-data", "/action-log", "/ai-assistant", "/knowledge-base"],
  },
];

// Список всех модулей для управления правами
export const ALL_MODULES = MODULE_LINKS.map(m => ({ path: m.path, label: m.label }));

export const getLinksForRole = (role: UserRole, userEmail?: string) => 
  MODULE_LINKS.filter((link) => {
    // Проверяем роль
    if (!link.roles.includes(role)) return false;
    // Если указаны allowedUsers, проверяем что пользователь в списке
    if (link.allowedUsers && link.allowedUsers.length > 0) {
      if (!userEmail) return false;
      return link.allowedUsers.includes(userEmail);
    }
    return true;
  });

// Фильтрация модулей по правам из БД
export const getLinksWithPermissions = (
  role: UserRole,
  allowedModules: string[],
  isFullAccess: boolean,
  userEmail?: string
) => {
  // Для ролей с полным доступом возвращаем все модули
  if (isFullAccess || FULL_ACCESS_ROLES.includes(role)) {
    return MODULE_LINKS.filter((link) => {
      if (link.allowedUsers && link.allowedUsers.length > 0) {
        if (!userEmail) return false;
        return link.allowedUsers.includes(userEmail);
      }
      return true;
    });
  }

  // Для остальных ролей фильтруем по разрешённым модулям
  return MODULE_LINKS.filter((link) => {
    // Убираем начальный слэш для сравнения
    const moduleId = link.path.startsWith("/") ? link.path.slice(1) : link.path;
    
    // Проверяем что модуль разрешён
    if (!allowedModules.includes(moduleId)) return false;
    
    // Если указаны allowedUsers, проверяем что пользователь в списке
    if (link.allowedUsers && link.allowedUsers.length > 0) {
      if (!userEmail) return false;
      return link.allowedUsers.includes(userEmail);
    }
    
    return true;
  });
};

export const groupModuleLinks = (links: ModuleLink[]) =>
  ERP_NAV_GROUPS
    .map((group) => ({
      ...group,
      links: group.paths
        .map((path) => links.find((link) => link.path === path))
        .filter((link): link is ModuleLink => Boolean(link)),
    }))
    .filter((group) => group.links.length > 0);
