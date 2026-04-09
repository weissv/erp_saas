// src/layouts/MainLayoutV2.tsx
// ──────────────────────────────────────────────────────────────────────────────
// Enterprise Two-Tier Sidebar Layout with Command Palette & Tenant Switcher
// ──────────────────────────────────────────────────────────────────────────────
// Architecture:
//   Tier 1 (Left Rail) — 60px, icons only: module selection
//   Tier 2 (Collapsible Drawer) — 240px, contextual sub-navigation
//   Topbar — Command Palette (Ctrl+K / Cmd+K), Tenant Switcher, User Menu
//   Mobile — Hamburger → bottom-sheet navigation
// ──────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  Building2,
  ChevronLeft,
  ChevronsUpDown,
  DollarSign,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import { Toaster } from "sonner";

import { useAuth } from "../hooks/useAuth";
import { cn } from "../lib/utils";
import { ROLE_LABELS } from "../types/auth";
import { Spinner } from "../components/ui/LoadingState";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "../components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

// ─── Module Definitions ──────────────────────────────────────────────────────

type SubLink = {
  path: string;
  label: string;
};

type ModuleDefinition = {
  id: string;
  label: string;
  icon: React.ElementType;
  basePath: string;
  subLinks: SubLink[];
};

const MODULES: ModuleDefinition[] = [
  {
    id: "dashboard",
    label: "Дашборд",
    icon: LayoutDashboard,
    basePath: "/dashboard",
    subLinks: [{ path: "/dashboard", label: "Обзор" }],
  },
  {
    id: "lms",
    label: "LMS",
    icon: GraduationCap,
    basePath: "/lms",
    subLinks: [
      { path: "/lms/school", label: "Школа" },
      { path: "/lms/school/classes", label: "Классы" },
      { path: "/lms/school/gradebook", label: "Оценки" },
      { path: "/lms/school/schedule", label: "Расписание" },
      { path: "/lms/school/homework", label: "Домашние задания" },
      { path: "/lms/diary", label: "Дневник" },
    ],
  },
  {
    id: "finance",
    label: "Финансы",
    icon: DollarSign,
    basePath: "/finance",
    subLinks: [
      { path: "/finance", label: "Обзор" },
      { path: "/integration", label: "Импорт/Экспорт" },
      { path: "/onec-data", label: "Данные 1С" },
    ],
  },
  {
    id: "people",
    label: "Люди",
    icon: Users,
    basePath: "/children",
    subLinks: [
      { path: "/children", label: "Дети" },
      { path: "/employees", label: "Сотрудники" },
      { path: "/groups", label: "Классы" },
      { path: "/attendance", label: "Посещаемость" },
      { path: "/staffing", label: "Штатное расписание" },
    ],
  },
  {
    id: "inventory",
    label: "Склад",
    icon: Package,
    basePath: "/inventory",
    subLinks: [
      { path: "/inventory", label: "Склад" },
      { path: "/menu", label: "Меню" },
      { path: "/recipes", label: "Рецепты" },
      { path: "/procurement", label: "Закупки" },
    ],
  },
  {
    id: "school",
    label: "Школа",
    icon: BookOpen,
    basePath: "/exams",
    subLinks: [
      { path: "/exams", label: "Контрольные" },
      { path: "/schedule", label: "Расписание" },
      { path: "/calendar", label: "Календарь" },
      { path: "/documents", label: "Документы" },
      { path: "/knowledge-base", label: "База знаний" },
    ],
  },
  {
    id: "settings",
    label: "Настройки",
    icon: Settings,
    basePath: "/users",
    subLinks: [
      { path: "/users", label: "Пользователи" },
      { path: "/security", label: "Безопасность" },
      { path: "/maintenance", label: "Заявки" },
      { path: "/notifications", label: "Уведомления" },
      { path: "/action-log", label: "Журнал действий" },
      { path: "/feedback", label: "Баг-репорт" },
      { path: "/ai-assistant", label: "ИИ-Методист" },
    ],
  },
];

// ─── Tenant Stub (replace with real context / API) ───────────────────────────

type Tenant = {
  id: string;
  name: string;
};

const DEMO_TENANTS: Tenant[] = [
  { id: "mezon", name: "Mezon School" },
  { id: "greenhill", name: "Greenhill Academy" },
];

// ─── Command Palette Searchable Items ────────────────────────────────────────

type SearchableItem = {
  label: string;
  path: string;
  group: string;
};

function buildSearchItems(): SearchableItem[] {
  const items: SearchableItem[] = [];
  for (const mod of MODULES) {
    for (const sub of mod.subLinks) {
      items.push({ label: sub.label, path: sub.path, group: mod.label });
    }
  }
  return items;
}

// ─── Sidebar Rail (Tier 1) ───────────────────────────────────────────────────

function SidebarRail({
  activeModuleId,
  onSelect,
}: {
  activeModuleId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <TooltipProvider delayDuration={0}>
      <nav
        className="flex h-full w-[60px] shrink-0 flex-col items-center gap-1 border-r border-sidebar-border bg-sidebar py-3"
        aria-label="Module navigation"
      >
        {MODULES.map((mod) => {
          const Icon = mod.icon;
          const isActive = mod.id === activeModuleId;
          return (
            <Tooltip key={mod.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onSelect(mod.id)}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={mod.label}
                >
                  <Icon className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{mod.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
    </TooltipProvider>
  );
}

// ─── Sidebar Drawer (Tier 2) ─────────────────────────────────────────────────

function SidebarDrawer({
  module,
  collapsed,
  onCollapse,
}: {
  module: ModuleDefinition;
  collapsed: boolean;
  onCollapse: () => void;
}) {
  const location = useLocation();

  return (
    <AnimatePresence initial={false}>
      {!collapsed && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 240, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
          className="flex h-full shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar"
          aria-label={`${module.label} sub-navigation`}
        >
          {/* Drawer header */}
          <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-3">
            <span className="text-sm font-semibold text-sidebar-foreground truncate">
              {module.label}
            </span>
            <button
              onClick={onCollapse}
              className="rounded-md p-1 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              aria-label="Свернуть панель"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          {/* Sub-links */}
          <nav className="flex-1 overflow-y-auto px-2 py-2">
            <ul className="flex flex-col gap-0.5">
              {module.subLinks.map((link) => {
                const isActive =
                  location.pathname === link.path ||
                  location.pathname.startsWith(`${link.path}/`);
                return (
                  <li key={link.path}>
                    <Link
                      to={link.path}
                      className={cn(
                        "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

// ─── Topbar ──────────────────────────────────────────────────────────────────

function Topbar({
  onOpenCommandPalette,
  onOpenMobileMenu,
  currentTenant,
  tenants,
  onSwitchTenant,
}: {
  onOpenCommandPalette: () => void;
  onOpenMobileMenu: () => void;
  currentTenant: Tenant;
  tenants: Tenant[];
  onSwitchTenant: (t: Tenant) => void;
}) {
  const { user, logout } = useAuth();
  const userName = user?.employee
    ? [user.employee.firstName, user.employee.lastName].filter(Boolean).join(" ")
    : user?.email;
  const userRoleLabel = user ? (ROLE_LABELS[user.role] ?? user.role) : "";

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      {/* Left: Mobile hamburger + Tenant switcher */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="rounded-md p-2 text-foreground/70 hover:bg-accent hover:text-accent-foreground lg:hidden"
          aria-label="Меню"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Tenant Switcher */}
        {tenants.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-card-foreground shadow-sm hover:bg-accent transition-colors">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="max-w-[140px] truncate">{currentTenant.name}</span>
                <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Переключить школу</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {tenants.map((t) => (
                <DropdownMenuItem
                  key={t.id}
                  onSelect={() => onSwitchTenant(t)}
                  className={cn(t.id === currentTenant.id && "bg-accent")}
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  {t.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Center: Command Palette trigger */}
      <button
        onClick={onOpenCommandPalette}
        className="hidden md:flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors w-full max-w-sm"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Поиск учеников, счетов, классов…</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Right: User menu */}
      <div className="flex items-center gap-2">
        {/* Mobile search */}
        <button
          onClick={onOpenCommandPalette}
          className="rounded-md p-2 text-foreground/70 hover:bg-accent hover:text-accent-foreground md:hidden"
          aria-label="Поиск"
        >
          <Search className="h-5 w-5" />
        </button>

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {(userName ?? "U").charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:block max-w-[120px] truncate text-foreground">
                  {userName}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{userName}</p>
                  <p className="text-xs text-muted-foreground">{userRoleLabel}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={logout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Выйти
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}

// ─── Mobile Bottom Sheet ─────────────────────────────────────────────────────

function MobileNav({
  isOpen,
  onClose,
  modules,
  activeModuleId,
  onSelectModule,
}: {
  isOpen: boolean;
  onClose: () => void;
  modules: ModuleDefinition[];
  activeModuleId: string;
  onSelectModule: (id: string) => void;
}) {
  const location = useLocation();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 lg:hidden"
            onClick={onClose}
          />

          {/* Bottom sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-hidden rounded-t-2xl border-t bg-background shadow-floating lg:hidden"
          >
            {/* Drag handle */}
            <div className="flex justify-center py-2">
              <div className="h-1.5 w-12 rounded-full bg-muted" />
            </div>

            {/* Close button */}
            <div className="flex justify-end px-4 pb-2">
              <button
                onClick={onClose}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent"
                aria-label="Закрыть"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Module grid */}
            <div className="grid grid-cols-4 gap-2 px-4 pb-4">
              {modules.map((mod) => {
                const Icon = mod.icon;
                const isActive = mod.id === activeModuleId;
                return (
                  <button
                    key={mod.id}
                    onClick={() => {
                      onSelectModule(mod.id);
                      onClose();
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl p-3 text-xs font-medium transition-colors min-h-[44px]",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="leading-tight">{mod.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Active module sub-links */}
            {modules
              .filter((m) => m.id === activeModuleId)
              .map((mod) => (
                <div key={mod.id} className="border-t px-4 pb-6 pt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {mod.label}
                  </p>
                  <ul className="flex flex-col gap-0.5">
                    {mod.subLinks.map((link) => {
                      const isActive =
                        location.pathname === link.path ||
                        location.pathname.startsWith(`${link.path}/`);
                      return (
                        <li key={link.path}>
                          <Link
                            to={link.path}
                            onClick={onClose}
                            className={cn(
                              "flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px]",
                              isActive
                                ? "bg-primary/10 text-primary"
                                : "text-foreground hover:bg-accent",
                            )}
                          >
                            {link.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Main Layout ─────────────────────────────────────────────────────────────

export default function MainLayoutV2() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // ── State ──
  const [drawerCollapsed, setDrawerCollapsed] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState("dashboard");
  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [currentTenant, setCurrentTenant] = useState<Tenant>(DEMO_TENANTS[0]);

  // Derive active module from URL
  useEffect(() => {
    const found = MODULES.find(
      (mod) =>
        location.pathname === mod.basePath ||
        location.pathname.startsWith(`${mod.basePath}/`) ||
        mod.subLinks.some(
          (sl) =>
            location.pathname === sl.path || location.pathname.startsWith(`${sl.path}/`),
        ),
    );
    if (found) setActiveModuleId(found.id);
  }, [location.pathname]);

  // ── Command Palette keyboard shortcut (Ctrl+K / Cmd+K) ──
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const activeModule = useMemo(
    () => MODULES.find((m) => m.id === activeModuleId) ?? MODULES[0],
    [activeModuleId],
  );

  const searchItems = useMemo(() => buildSearchItems(), []);

  const handleModuleSelect = useCallback(
    (id: string) => {
      setActiveModuleId(id);
      if (drawerCollapsed) setDrawerCollapsed(false);
    },
    [drawerCollapsed],
  );

  // ── Loading / Unauthenticated States ──
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <span className="text-sm text-muted-foreground">Загрузка…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <div className="max-w-md space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
            <svg
              className="h-7 w-7 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
          </div>
          <p className="text-lg font-semibold text-foreground">Сессия потеряна</p>
          <p className="text-sm text-muted-foreground">
            Вы не авторизованы или ваша сессия устарела.
          </p>
          <Link
            to="/auth/login"
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            Перейти к входу
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ── Topbar ── */}
      <Topbar
        onOpenCommandPalette={() => setCommandOpen(true)}
        onOpenMobileMenu={() => setMobileNavOpen(true)}
        currentTenant={currentTenant}
        tenants={DEMO_TENANTS}
        onSwitchTenant={setCurrentTenant}
      />

      {/* ── Body: Rail + Drawer + Content ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar (hidden on mobile) */}
        <div className="hidden lg:flex h-[calc(100vh-3.5rem)] sticky top-14">
          <SidebarRail activeModuleId={activeModuleId} onSelect={handleModuleSelect} />
          <SidebarDrawer
            module={activeModule}
            collapsed={drawerCollapsed}
            onCollapse={() => setDrawerCollapsed(true)}
          />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <Toaster position="top-right" richColors />
          <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ── Mobile Navigation (Bottom Sheet) ── */}
      <MobileNav
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        modules={MODULES}
        activeModuleId={activeModuleId}
        onSelectModule={handleModuleSelect}
      />

      {/* ── Command Palette (Ctrl+K / Cmd+K) ── */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Поиск учеников, счетов, классов…" />
        <CommandList>
          <CommandEmpty>Ничего не найдено.</CommandEmpty>
          {MODULES.map((mod) => (
            <CommandGroup key={mod.id} heading={mod.label}>
              {mod.subLinks.map((link) => (
                <CommandItem
                  key={link.path}
                  onSelect={() => {
                    setCommandOpen(false);
                    // Navigate programmatically — using window.location
                    // as CommandDialog runs outside Router context sometimes
                    window.location.href = link.path;
                  }}
                >
                  <mod.icon className="mr-2 h-4 w-4" />
                  {link.label}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
          <CommandSeparator />
        </CommandList>
      </CommandDialog>
    </div>
  );
}
