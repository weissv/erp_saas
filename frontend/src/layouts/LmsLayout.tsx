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

export default function LmsLayout() {
 const { user, isLoading} = useAuth();
  const { isDemo } = useDemo();
  const { tenant} = useTenant();
  const location = useLocation();
  const userName = user?.employee
    ? [user.employee.firstName, user.employee.lastName].filter(Boolean).join(" ")
    : user?.email;
  const userRoleLabel = user ? ROLE_LABELS[user.role] ?? user.role : "";
  const sectionLabel = [
    ["/lms/school/classes", "Классы и потоки"],
    ["/lms/school/gradebook", "Журнал и оценки"],
    ["/lms/school/schedule", "Расписание занятий"],
    ["/lms/school/homework", "Домашние задания"],
    ["/lms/school/attendance", "Посещаемость"],
    ["/lms/diary", "Дневник ученика"],
    ["/lms/school", "Школьная аналитика"],
  ].find(([path]) => location.pathname.startsWith(path))?.[1] ?? "Школьная LMS";

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
      {/* Mobile menu button */}
      <button 
        className="mezon-mobile-menu-btn"
        onClick={() => {
          window.dispatchEvent(new CustomEvent('toggle-mobile-menu'));
        }}
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      
      <div className="mezon-top-bar__cluster mezon-top-bar__cluster--compact">
        {tenant.supportPhone && (
          <span className="mezon-chip">{tenant.supportPhone}</span>
        )}
        {tenant.supportEmail && (
          <span className="mezon-chip">{tenant.supportEmail}</span>
        )}
      </div>
      <div className="mezon-top-bar__cluster">
        {/* Кнопка "Вернуться в ERP" доступна всем ролям включая учителей */}
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
                  <span className="mezon-workspace-hero__eyebrow">LMS · учебный контур</span>
                  <h1>{sectionLabel}</h1>
                  <p>
                    Школьная LMS получила тот же визуальный язык, что и лендинг:
                    светлые стеклянные панели, акцентные CTA и спокойную иерархию
                    для ежедневной работы преподавателей, учеников и администрации.
                  </p>
                </div>

                <div className="mezon-workspace-hero__actions">
                  <span className="mezon-chip">{isDemo ? "Demo school" : tenant.name}</span>
                  {userRoleLabel && <span className="mezon-chip">{userRoleLabel}</span>}
                  <Link to="/dashboard" className="mezon-btn mezon-btn--outline">
                    <LayoutDashboard className="h-4 w-4" />
                    Вернуться в ERP
                  </Link>
                </div>
              </div>

              <div className="mezon-workspace-hero__meta">
                <div className="mezon-workspace-hero__meta-card">
                  <strong>Текущий участник</strong>
                  <span>{userName ?? "Пользователь"} работает в одном учебном интерфейсе без лишнего визуального шума.</span>
                </div>
                <div className="mezon-workspace-hero__meta-card">
                  <strong>Коммуникация и поддержка</strong>
                  <span>{tenant.supportEmail || tenant.supportPhone || "Контакты поддержки доступны внутри тенанта."}</span>
                </div>
                <div className="mezon-workspace-hero__meta-card">
                  <strong>Сквозной сценарий</strong>
                  <span>От расписания до дневника — учебный контур визуально синхронизирован с ERP и лендингом.</span>
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
