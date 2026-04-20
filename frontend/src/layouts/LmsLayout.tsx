// src/layouts/LmsLayout.tsx
import { Link, Outlet, useLocation } from "react-router-dom";
import { Menu, LayoutDashboard } from "lucide-react";
import LmsSideNav from "../components/LmsSideNav";
import { Toaster } from "sonner";
import { useAuth } from "../hooks/useAuth";
import { useDemo } from "../contexts/DemoContext";
import { useTenant } from "../contexts/TenantContext";
import { Spinner } from "../components/ui/LoadingState";
import { ROLE_LABELS } from "../types/auth";
import { getLmsSectionLabel, LMS_WORKSPACE_COPY } from "./workspaceCopy";

export default function LmsLayout() {
  const { user, isLoading } = useAuth();
  const { isDemo } = useDemo();
  const { tenant } = useTenant();
  const location = useLocation();
  const userName = user?.employee
    ? [user.employee.firstName, user.employee.lastName].filter(Boolean).join(" ")
    : user?.email;
  const userRoleLabel = user ? ROLE_LABELS[user.role] ?? user.role : "";
  const sectionLabel = getLmsSectionLabel(location.pathname);
  const supportItems = [tenant.supportPhone, tenant.supportEmail].filter(Boolean);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-canvas">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <span className="text-[13px] text-text-tertiary tracking-[-0.01em]">Загрузка...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg-canvas px-6 text-center">
        <div className="max-w-md space-y-4">
          <p className="text-xl font-semibold text-text-primary">
            {isDemo ? "Демо LMS обновляется" : "Сессия потеряна"}
          </p>
          <p className="text-[13px] text-text-tertiary">
            {isDemo
              ? "Логин для demo-LMS не нужен. Если доступ сбросился, откройте демонстрационную школу ещё раз."
              : "Вы не авторизованы. Войдите для доступа к LMS."}
          </p>
          <Link
            to={isDemo ? "/school" : "/auth/login"}
            reloadDocument={isDemo}
            className="inline-flex items-center justify-center rounded-md bg-macos-blue px-5 py-2.5 text-[13px] font-medium text-white shadow-sm macos-transition hover:opacity-90"
          >
            {isDemo ? "Продолжить демо" : "Войти"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mezon-app">
      <header className="mezon-top-bar" role="banner">
        <div className="mezon-top-bar__leading">
          <button
            className="mezon-mobile-menu-btn"
            onClick={() => {
              window.dispatchEvent(new CustomEvent("toggle-mobile-menu"));
            }}
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="mezon-top-bar__title">
            <span>{tenant.name}</span>
            <strong>{sectionLabel}</strong>
          </div>
        </div>

        {supportItems.length > 0 && (
          <div className="mezon-top-bar__cluster mezon-top-bar__cluster--compact">
            {supportItems.map((item) => (
              <span key={item} className="mezon-chip mezon-chip--soft">{item}</span>
            ))}
          </div>
        )}
        <div className="mezon-top-bar__cluster">
          {user && (
            <span className="mezon-toolbar-pill">
              <span className="mezon-toolbar-pill__dot" />
              <span className="truncate max-w-[100px] sm:max-w-[180px]">{userName}</span>
              <span className="hidden text-[var(--text-tertiary)] sm:inline">· {userRoleLabel}</span>
            </span>
          )}
          <Link
            to="/dashboard"
            className="mezon-chip mezon-chip--teal flex items-center gap-2 cursor-pointer"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            Вернуться в ERP
          </Link>
        </div>
      </header>
      <div className="mezon-shell">
        <LmsSideNav />
        <main className="mezon-main" role="main" aria-label="Содержимое LMS">
          <Toaster position="top-right" richColors />
          <div className="mezon-main-inner macos-animate-fade-in">
            <div className="mezon-workspace">
              <section className="mezon-workspace-hero" aria-label="LMS workspace hero">
                <div className="mezon-workspace-hero__top">
                  <div className="mezon-workspace-hero__headline">
                    <span className="mezon-workspace-hero__eyebrow">{LMS_WORKSPACE_COPY.eyebrow}</span>
                    <h1>{sectionLabel}</h1>
                    <p>{LMS_WORKSPACE_COPY.description}</p>
                  </div>

                  <div className="mezon-workspace-hero__actions">
                    <span className="mezon-chip">{isDemo ? "Demo school" : tenant.name}</span>
                    {userRoleLabel && <span className="mezon-chip mezon-chip--soft">{userRoleLabel}</span>}
                    <Link to="/dashboard" className="mezon-btn mezon-btn--outline">
                      <LayoutDashboard className="h-4 w-4" />
                      Вернуться в ERP
                    </Link>
                  </div>
                </div>

                <div className="mezon-workspace-hero__meta">
                  <div className="mezon-workspace-hero__meta-card">
                    <strong>{LMS_WORKSPACE_COPY.participantTitle}</strong>
                    <span>{userName ?? "Пользователь"} работает в одном учебном интерфейсе без лишнего визуального шума.</span>
                  </div>
                  <div className="mezon-workspace-hero__meta-card">
                    <strong>{LMS_WORKSPACE_COPY.supportTitle}</strong>
                    <span>{tenant.supportEmail || tenant.supportPhone || LMS_WORKSPACE_COPY.supportFallback}</span>
                  </div>
                  <div className="mezon-workspace-hero__meta-card">
                    <strong>{LMS_WORKSPACE_COPY.continuityTitle}</strong>
                    <span>{LMS_WORKSPACE_COPY.continuityDescription}</span>
                  </div>
                </div>
              </section>

              <div className="mezon-workspace-content">
                <Outlet />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
