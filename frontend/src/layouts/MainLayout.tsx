// src/layouts/MainLayout.tsx
import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { Menu, GraduationCap } from "lucide-react";
import SideNav from "../components/SideNav";
import DoomGame from "../components/DoomGame";
import { Toaster } from "sonner";
import { useKonamiCode } from "../hooks/useKonamiCode";
import { useAuth } from "../hooks/useAuth";
import { useTenant } from "../contexts/TenantContext";
import { ROLE_LABELS } from "../types/auth";
import { Spinner } from "../components/ui/LoadingState";

export default function MainLayout() {
  const { user, isLoading } = useAuth();
  const { tenant } = useTenant();
  const [showDoom, setShowDoom] = useState(false);
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
            <svg className="w-7 h-7 text-macos-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <p className="text-[18px] font-semibold text-text-primary tracking-[-0.02em]">
            Сессия потеряна
          </p>
          <p className="text-[14px] text-text-tertiary leading-relaxed">
            Вы не авторизованы или ваша сессия устарела.
          </p>
          <Link
            to="/auth/login"
            className="inline-flex items-center justify-center rounded-md bg-macos-blue px-5 py-2.5 text-[13px] font-medium text-white shadow-subtle macos-transition hover:bg-macos-blue-hover"
          >
            Перейти к входу
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mezon-app">
      {showDoom && <DoomGame onClose={() => setShowDoom(false)} />}

      {/* ── Top Bar ── */}
      <header className="mezon-top-bar">
        <div className="mezon-top-bar__leading">
          <button
            className="mezon-mobile-menu-btn"
            onClick={() => {
              (window as any).toggleMobileMenu?.();
            }}
            aria-label="Toggle menu"
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
        <main className="mezon-main">
          <Toaster position="top-right" richColors />
          <div className="mezon-main-inner macos-animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
