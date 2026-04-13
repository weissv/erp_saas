// src/layouts/MainLayout.tsx
import { useState, useEffect } from "react";
import { Link, Outlet } from "react-router-dom";
import { Menu, GraduationCap, Lock } from "lucide-react";
import SideNav from "../components/SideNav";
import DoomGame from "../components/DoomGame";
import { Toaster } from "sonner";
import { useKonamiCode } from "../hooks/useKonamiCode";
import { useAuth } from "../hooks/useAuth";
import { useDemo } from "../contexts/DemoContext";
import { useTenant } from "../contexts/TenantContext";
import { ROLE_LABELS } from "../types/auth";
import { Spinner } from "../components/ui/LoadingState";
import { MissingOpenAiKeyDialog } from "../features/ai/components/MissingOpenAiKeyDialog";
import { installOpenAiKeyErrorInterceptor } from "../features/ai/setup-openai-error-interceptor";

export default function MainLayout() {
  const { user, isLoading } = useAuth();
  const { isDemo } = useDemo();
  const { tenant } = useTenant();
  const [showDoom, setShowDoom] = useState(false);

  // Install global MISSING_OPENAI_KEY error interceptor once
  useEffect(() => {
    installOpenAiKeyErrorInterceptor();
  }, []);

  const userName = user?.employee
    ? [user.employee.firstName, user.employee.lastName].filter(Boolean).join(" ")
    : user?.email;
  const userRoleLabel = user ? ROLE_LABELS[user.role] ?? user.role : "";

  useKonamiCode(() => {
    if (user) setShowDoom(true);
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-canvas">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <span className="text-[13px] text-text-tertiary tracking-[-0.01em]">
            Загрузка...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg-canvas px-6 text-center">
        <div className="max-w-md space-y-4">
          <div className="mx-auto w-14 h-14 bg-tint-blue rounded-xl flex items-center justify-center mb-2">
            <Lock className="w-7 h-7 text-macos-blue" strokeWidth={1.5} />
          </div>
          <p className="text-[18px] font-semibold text-text-primary tracking-[-0.02em]">
            {isDemo ? "Демо обновляется" : "Сессия потеряна"}
          </p>
          <p className="text-[14px] text-text-tertiary leading-relaxed">
            {isDemo
              ? "Логин для demo-контура не нужен. Если сессия сбросилась, откройте рабочее демо ещё раз."
              : "Вы не авторизованы или ваша сессия устарела."}
          </p>
          <Link
            to={isDemo ? "/dashboard" : "/auth/login"}
            reloadDocument={isDemo}
            className="inline-flex items-center justify-center rounded-md bg-macos-blue px-5 py-2.5 text-[13px] font-medium text-white shadow-subtle macos-transition hover:bg-macos-blue-hover"
          >
            {isDemo ? "Продолжить демо" : "Перейти к входу"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mezon-app">
      {showDoom && <DoomGame onClose={() => setShowDoom(false)} />}

      {/* ── Top Bar ── */}
      <header className="mezon-top-bar" role="banner">
        <div className="mezon-top-bar__leading">
          <button
            className="mezon-mobile-menu-btn"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('toggle-mobile-menu'));
            }}
            aria-label="Открыть меню"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="mezon-window-controls" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="mezon-top-bar__title">
            <span>{tenant.name}</span>
            <strong>Единое рабочее пространство</strong>
          </div>
        </div>

        <div className="mezon-top-bar__cluster mezon-top-bar__cluster--compact">
          {tenant.supportPhone && (
            <span className="mezon-chip">{tenant.supportPhone}</span>
          )}
          {tenant.supportEmail && (
            <span className="mezon-chip">{tenant.supportEmail}</span>
          )}
        </div>

        <div className="mezon-top-bar__cluster">
          {user && (
            <span className="mezon-toolbar-pill">
              <span className="mezon-toolbar-pill__dot" />
              <span className="truncate max-w-[180px]">{userName}</span>
              <span className="hidden text-[var(--text-tertiary)] sm:inline">· {userRoleLabel}</span>
            </span>
          )}
          <Link
            to="/lms"
            className="mezon-chip mezon-chip--teal flex items-center gap-2 cursor-pointer"
          >
            <GraduationCap className="h-3.5 w-3.5" />
            Школьная LMS
          </Link>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="mezon-shell">
        <SideNav />
        <main className="mezon-main" role="main" aria-label="Основное содержимое">
          <Toaster position="top-right" richColors />
          <MissingOpenAiKeyDialog />
          <div className="mezon-main-inner macos-animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
