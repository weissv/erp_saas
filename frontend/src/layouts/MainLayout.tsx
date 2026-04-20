// src/layouts/MainLayout.tsx
import { useState, useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Menu, GraduationCap, Lock, ChevronRight, Home } from "lucide-react";
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
import { ERP_WORKSPACE_COPY, getErpSectionLabel } from "./workspaceCopy";

function Breadcrumb({ pathname }: { pathname: string }) {
  const sectionLabel = getErpSectionLabel(pathname);
  const isHome = pathname === "/" || pathname === "/dashboard";

  if (isHome) return null;

  return (
    <nav className="mezon-breadcrumb" aria-label="Навигация">
      <Link to="/dashboard">
        <Home className="w-3.5 h-3.5" />
      </Link>
      <span className="mezon-breadcrumb__separator" aria-hidden>
        <ChevronRight className="w-3 h-3" />
      </span>
      <span className="mezon-breadcrumb__current">{sectionLabel}</span>
    </nav>
  );
}

export default function MainLayout() {
  const { user, isLoading } = useAuth();
  const { isDemo } = useDemo();
  const { tenant } = useTenant();
  const location = useLocation();
  const [showDoom, setShowDoom] = useState(false);

  // Install global MISSING_OPENAI_KEY error interceptor once
  useEffect(() => {
    installOpenAiKeyErrorInterceptor();
  }, []);

  const userName = user?.employee
    ? [user.employee.firstName, user.employee.lastName].filter(Boolean).join(" ")
    : user?.email;
  const userRoleLabel = user ? ROLE_LABELS[user.role] ?? user.role : "";
  const sectionLabel = getErpSectionLabel(location.pathname);
  const supportItems = [tenant.supportPhone, tenant.supportEmail].filter(Boolean);

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

      {/* Skip to main content */}
      <a href="#main-content" className="skip-to-content">
        Перейти к содержимому
      </a>

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
        <main id="main-content" className="mezon-main" role="main" aria-label="Основное содержимое">
          <Toaster position="top-right" richColors />
          <MissingOpenAiKeyDialog />
          <div className="mezon-main-inner macos-animate-fade-in">
            <div className="mezon-workspace">
              <section className="mezon-workspace-hero" aria-label="ERP workspace hero">
                <div className="mezon-workspace-hero__top">
                  <div className="mezon-workspace-hero__headline">
                     <span className="mezon-workspace-hero__eyebrow">{ERP_WORKSPACE_COPY.eyebrow}</span>
                     <h1>{sectionLabel}</h1>
                    <p>
                      {ERP_WORKSPACE_COPY.description} {tenant.name}.
                    </p>
                  </div>

                  <div className="mezon-workspace-hero__actions">
                    <span className="mezon-chip">{isDemo ? "Demo contour" : "Live workspace"}</span>
                    {userRoleLabel && <span className="mezon-chip mezon-chip--soft">{userRoleLabel}</span>}
                    <Link
                      to="/lms"
                      className="mezon-btn mezon-btn--outline"
                    >
                      <GraduationCap className="h-4 w-4" />
                      Открыть LMS
                    </Link>
                  </div>
                </div>

                <div className="mezon-workspace-hero__meta">
                  <div className="mezon-workspace-hero__meta-card">
                    <strong>{ERP_WORKSPACE_COPY.operatorTitle}</strong>
                    <span>{userName ?? "Пользователь"} · доступ и задачи под рукой.</span>
                  </div>
                  <div className="mezon-workspace-hero__meta-card">
                    <strong>{ERP_WORKSPACE_COPY.supportTitle}</strong>
                    <span>{tenant.supportEmail || tenant.supportPhone || ERP_WORKSPACE_COPY.supportFallback}</span>
                  </div>
                  <div className="mezon-workspace-hero__meta-card">
                    <strong>{ERP_WORKSPACE_COPY.continuityTitle}</strong>
                    <span>{ERP_WORKSPACE_COPY.continuityDescription}</span>
                  </div>
                </div>
              </section>

              <Breadcrumb pathname={location.pathname} />

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
