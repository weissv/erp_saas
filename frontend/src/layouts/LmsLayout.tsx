// src/layouts/LmsLayout.tsx
import { useState} from"react";
import { Link, Outlet} from"react-router-dom";
import { Menu, LayoutDashboard} from"lucide-react";
import LmsSideNav from"../components/LmsSideNav";
import { Toaster} from"sonner";
import { useAuth} from"../hooks/useAuth";
import { useTenant} from"../contexts/TenantContext";

export default function LmsLayout() {
 const { user, isLoading} = useAuth();
 const { tenant} = useTenant();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-canvas">
        <span className="text-[13px] text-text-tertiary">Загрузка...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg-canvas px-6 text-center">
        <div className="max-w-md space-y-4">
          <p className="text-xl font-semibold text-text-primary">Сессия потеряна</p>
          <p className="text-[13px] text-text-tertiary">
            Вы не авторизованы. Войдите для доступа к LMS.
          </p>
          <Link
            to="/auth/login"
            className="inline-flex items-center justify-center rounded-md bg-macos-blue px-5 py-2.5 text-[13px] font-medium text-white shadow-sm macos-transition hover:opacity-90"
          >
            Войти
          </Link>
        </div>
      </div>
    );
  }

 return (
 <div className="mezon-app">
 <header className="mezon-top-bar">
      {/* Mobile menu button */}
      <button 
        className="mezon-mobile-menu-btn"
        onClick={() => {
          if (typeof window !== 'undefined' && (window as any).toggleMobileMenu) {
            (window as any).toggleMobileMenu();
          }
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
