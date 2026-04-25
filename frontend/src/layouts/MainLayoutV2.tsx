import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  ChevronLeft,
  ChevronsUpDown,
  Command,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { Toaster } from "sonner";

import { useAuth } from "../hooks/useAuth";
import { useDemo } from "../contexts/DemoContext";
import { useTenant } from "../contexts/TenantContext";
import { usePermissions } from "../contexts/PermissionsContext";
import { cn } from "../lib/utils";
import { FULL_ACCESS_ROLES, getLinksWithPermissions, groupModuleLinks } from "../lib/modules";
import { ROLE_LABELS, type UserRole } from "../types/auth";
import { Spinner } from "../components/ui/LoadingState";
import { Button } from "../components/ui/button";
import { MissingOpenAiKeyDialog } from "../features/ai/components/MissingOpenAiKeyDialog";
import { getErpSectionLabel } from "./workspaceCopy";
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
} from "../components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

type NavGroup = ReturnType<typeof groupModuleLinks>[number];

const GROUP_ICONS: Record<string, LucideIcon> = {
  overview: LayoutDashboard,
  people: Users,
  operations: Briefcase,
  platform: Settings,
};

function resolveActiveGroupId(groups: NavGroup[], pathname: string) {
  const matched = groups.find((group) =>
    group.links.some((link) => pathname === link.path || pathname.startsWith(`${link.path}/`)),
  );

  return matched?.id ?? groups[0]?.id ?? "overview";
}

function SidebarRail({
  groups,
  activeGroupId,
  onSelect,
}: {
  groups: NavGroup[];
  activeGroupId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <TooltipProvider delayDuration={0}>
      <nav
        className="flex h-full w-[72px] shrink-0 flex-col items-center gap-2 border-r border-sidebar-border bg-sidebar px-3 py-4"
        aria-label="Основные группы навигации"
      >
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Sparkles className="h-4 w-4" />
        </div>
        {groups.map((group) => {
          const Icon = GROUP_ICONS[group.id] ?? LayoutDashboard;
          const isActive = group.id === activeGroupId;

          return (
            <Tooltip key={group.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onSelect(group.id)}
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-xl border transition-colors",
                    isActive
                      ? "border-primary/20 bg-primary text-primary-foreground shadow-sm"
                      : "border-transparent text-sidebar-foreground/70 hover:border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={group.label}
                >
                  <Icon className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{group.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
    </TooltipProvider>
  );
}

function SidebarDrawer({
  group,
  collapsed,
  onCollapse,
}: {
  group: NavGroup | undefined;
  collapsed: boolean;
  onCollapse: () => void;
}) {
  const location = useLocation();

  return (
    <AnimatePresence initial={false}>
      {!collapsed && group ? (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 288, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className="flex h-full shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar"
          aria-label={group.label}
        >
          <div className="border-b border-sidebar-border px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/55">
                  Навигация
                </p>
                <p className="text-sm font-semibold text-sidebar-foreground">{group.label}</p>
                <p className="text-sm leading-6 text-sidebar-foreground/65">
                  Быстрый доступ к ключевым разделам без лишнего шума.
                </p>
              </div>
              <button
                onClick={onCollapse}
                className="rounded-md p-2 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                aria-label="Свернуть навигацию"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            <div className="space-y-1">
              {group.links.map((link) => {
                const isActive =
                  location.pathname === link.path || location.pathname.startsWith(`${link.path}/`);
                const Icon = link.icon ?? ShieldCheck;

                if (link.isExternal) {
                  return (
                    <a
                      key={link.path}
                      href={link.path}
                      className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{link.label}</span>
                    </a>
                  );
                }

                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="truncate">{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}

function Topbar({
  tenantName,
  supportLabel,
  sectionLabel,
  onOpenCommandPalette,
  onOpenMobileMenu,
}: {
  tenantName: string;
  supportLabel?: string;
  sectionLabel: string;
  onOpenCommandPalette: () => void;
  onOpenMobileMenu: () => void;
}) {
  const { user, logout } = useAuth();
  const { isDemo } = useDemo();
  const userName = user?.employee
    ? [user.employee.firstName, user.employee.lastName].filter(Boolean).join(" ")
    : user?.email;
  const userRoleLabel = user ? (ROLE_LABELS[user.role] ?? user.role) : "";

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          onClick={onOpenMobileMenu}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-input bg-background text-foreground shadow-sm transition-colors hover:bg-accent lg:hidden"
          aria-label="Открыть меню"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <span className="truncate">{tenantName}</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden truncate sm:inline">{isDemo ? "Demo contour" : "Enterprise workspace"}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="truncate text-base font-semibold tracking-[-0.02em] text-foreground">
              {sectionLabel}
            </h1>
            {supportLabel ? (
              <span className="hidden truncate rounded-full border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground xl:inline-flex">
                <LifeBuoy className="mr-1 h-3.5 w-3.5" />
                {supportLabel}
              </span>
            ) : null}
          </div>
        </div>

        <button
          onClick={onOpenCommandPalette}
          className="hidden w-full max-w-md items-center gap-3 rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent md:flex"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Поиск учеников, документов, модулей…</span>
          <span className="inline-flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
            <Command className="h-3 w-3" />K
          </span>
        </button>

        <Link
          to="/lms"
          className="hidden items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent lg:inline-flex"
        >
          <GraduationCap className="h-4 w-4 text-primary" />
          LMS
        </Link>

        <button
          onClick={onOpenCommandPalette}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-input bg-background text-foreground shadow-sm transition-colors hover:bg-accent md:hidden"
          aria-label="Открыть поиск"
        >
          <Search className="h-4 w-4" />
        </button>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-3 rounded-md border border-input bg-background px-2 py-1.5 shadow-sm transition-colors hover:bg-accent">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-sm font-semibold text-primary">
                  {(userName ?? "U").charAt(0).toUpperCase()}
                </span>
                <span className="hidden min-w-0 text-left sm:block">
                  <span className="block truncate text-sm font-medium text-foreground">{userName}</span>
                  <span className="block truncate text-xs text-muted-foreground">{userRoleLabel}</span>
                </span>
                <ChevronsUpDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">{userName}</p>
                  <p className="text-xs text-muted-foreground">{userRoleLabel}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/lms">
                  <GraduationCap className="mr-2 h-4 w-4" />
                  Перейти в LMS
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={logout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Выйти
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </header>
  );
}

function MobileNav({
  isOpen,
  onClose,
  groups,
  activeGroupId,
  onSelectGroup,
}: {
  isOpen: boolean;
  onClose: () => void;
  groups: NavGroup[];
  activeGroupId: string;
  onSelectGroup: (id: string) => void;
}) {
  const location = useLocation();
  const activeGroup = groups.find((group) => group.id === activeGroupId) ?? groups[0];

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 lg:hidden"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border border-border bg-background p-4 shadow-2xl lg:hidden"
          >
            <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-muted" />
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Навигация</p>
                <p className="text-base font-semibold text-foreground">Модули Mirai</p>
              </div>
              <button
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-input bg-background text-foreground shadow-sm"
                aria-label="Закрыть"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {groups.map((group) => {
                const Icon = GROUP_ICONS[group.id] ?? LayoutDashboard;
                const isActive = group.id === activeGroupId;
                return (
                  <button
                    key={group.id}
                    onClick={() => onSelectGroup(group.id)}
                    className={cn(
                      "rounded-2xl border px-3 py-4 text-left transition-colors",
                      isActive
                        ? "border-primary/20 bg-primary/10 text-primary"
                        : "border-border bg-card text-foreground hover:bg-accent",
                    )}
                  >
                    <Icon className="mb-3 h-5 w-5" />
                    <span className="block text-sm font-medium">{group.label}</span>
                  </button>
                );
              })}
            </div>

            {activeGroup ? (
              <div className="mt-4 rounded-2xl border border-border bg-card p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {activeGroup.label}
                </p>
                <div className="space-y-1">
                  {activeGroup.links.map((link) => {
                    const isActive =
                      location.pathname === link.path || location.pathname.startsWith(`${link.path}/`);
                    const Icon = link.icon ?? ShieldCheck;
                    return link.isExternal ? (
                      <a
                        key={link.path}
                        href={link.path}
                        className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                      >
                        <Icon className="h-4 w-4" />
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        key={link.path}
                        to={link.path}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                          isActive ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

export default function MainLayoutV2() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { tenant, isLoading: tenantLoading } = useTenant();
  const { isDemo } = useDemo();
  const { permissions, isLoading: permissionsLoading } = usePermissions();

  const [drawerCollapsed, setDrawerCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const role = (user?.role ?? "TEACHER") as UserRole;

  const availableLinks = useMemo(() => {
    return getLinksWithPermissions(
      role,
      permissions?.modules ?? [],
      permissions?.isFullAccess || FULL_ACCESS_ROLES.includes(role),
      user?.email,
    );
  }, [permissions?.isFullAccess, permissions?.modules, role, user?.email]);

  const groupedLinks = useMemo(() => groupModuleLinks(availableLinks), [availableLinks]);

  const [activeGroupId, setActiveGroupId] = useState(() =>
    resolveActiveGroupId(groupedLinks, location.pathname),
  );

  useEffect(() => {
    setActiveGroupId(resolveActiveGroupId(groupedLinks, location.pathname));
  }, [groupedLinks, location.pathname]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((value) => !value);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const activeGroup = groupedLinks.find((group) => group.id === activeGroupId) ?? groupedLinks[0];
  const supportLabel = [tenant.supportPhone, tenant.supportEmail].filter(Boolean).join(" · ");
  const sectionLabel = getErpSectionLabel(location.pathname);

  const handleSelectGroup = useCallback(
    (groupId: string) => {
      setActiveGroupId(groupId);
      setDrawerCollapsed(false);
      const nextGroup = groupedLinks.find((group) => group.id === groupId);
      const nextLink = nextGroup?.links[0];

      if (nextLink && location.pathname !== nextLink.path) {
        navigate(nextLink.path);
      }
    },
    [groupedLinks, location.pathname, navigate],
  );

  if (authLoading || tenantLoading || permissionsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-muted-foreground">Подготавливаем рабочее пространство…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold tracking-[-0.02em] text-foreground">
            {isDemo ? "Демо готовится" : "Сессия потеряна"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {isDemo
              ? "Откройте демо-контур повторно, чтобы продолжить просмотр интерфейса."
              : "Авторизуйтесь снова, чтобы вернуться к рабочему пространству школы."}
          </p>
          <Button className="mt-6" onClick={() => navigate(isDemo ? "/dashboard" : "/auth/login")}>
            {isDemo ? "Продолжить демо" : "Перейти ко входу"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.06),transparent_26%)]" />

      <Topbar
        tenantName={tenant.name}
        supportLabel={supportLabel}
        sectionLabel={sectionLabel}
        onOpenCommandPalette={() => setCommandOpen(true)}
        onOpenMobileMenu={() => setMobileNavOpen(true)}
      />

      <div className="flex min-h-[calc(100vh-4rem)]">
        <div className="sticky top-16 hidden h-[calc(100vh-4rem)] lg:flex">
          <SidebarRail
            groups={groupedLinks}
            activeGroupId={activeGroupId}
            onSelect={handleSelectGroup}
          />
          <SidebarDrawer
            group={activeGroup}
            collapsed={drawerCollapsed}
            onCollapse={() => setDrawerCollapsed(true)}
          />
        </div>

        <main className="min-w-0 flex-1">
          <Toaster position="top-right" richColors />
          <MissingOpenAiKeyDialog />
          <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
            <section className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-md border border-border bg-muted px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Mirai school ERP
                    </span>
                    <span className="inline-flex rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                      {isDemo ? "Demo contour" : "Enterprise shell"}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
                      {sectionLabel}
                    </h2>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                      Чистый двухуровневый интерфейс для управления детьми, финансами, персоналом и школьными сервисами.
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border bg-background px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Школа</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{tenant.name}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-background px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Роль</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{ROLE_LABELS[role] ?? role}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-background px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Навигация</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{activeGroup?.label ?? "Обзор"}</p>
                  </div>
                </div>
              </div>
            </section>

            <Outlet />
          </div>
        </main>
      </div>

      <MobileNav
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        groups={groupedLinks}
        activeGroupId={activeGroupId}
        onSelectGroup={handleSelectGroup}
      />

      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Поиск модулей и разделов…" />
        <CommandList>
          <CommandEmpty>Ничего не найдено.</CommandEmpty>
          {groupedLinks.map((group) => (
            <CommandGroup key={group.id} heading={group.label}>
              {group.links.map((link) => {
                const Icon = link.icon ?? ShieldCheck;
                return (
                  <CommandItem
                    key={link.path}
                    onSelect={() => {
                      setCommandOpen(false);
                      if (link.isExternal) {
                        window.location.href = link.path;
                        return;
                      }
                      navigate(link.path);
                    }}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {link.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </div>
  );
}
