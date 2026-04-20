// src/components/SideNav.tsx
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import clsx from "clsx";
import { ArrowRight, LifeBuoy, Sparkles, X } from "lucide-react";
import { Button } from "./ui/button";
import { useAuth } from "../hooks/useAuth";
import { useTenant } from "../contexts/TenantContext";
import { usePermissions } from "../contexts/PermissionsContext";
import { getLinksWithPermissions, FULL_ACCESS_ROLES, groupModuleLinks } from "../lib/modules";
import { ROLE_LABELS, type UserRole } from "../types/auth";

export default function SideNav() {
  const { user, logout } = useAuth();
  const { tenant } = useTenant();
  const { permissions, isLoading: permissionsLoading } = usePermissions();
  const loc = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);
  const [isLogoSpinning, setIsLogoSpinning] = useState(false);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const role = (user?.role || "TEACHER") as UserRole;
  const userName = user?.employee
    ? [user.employee.firstName, user.employee.lastName].filter(Boolean).join(" ")
    : user?.email ?? "Пользователь";

  const links = getLinksWithPermissions(
    role,
    permissions?.modules || [],
    permissions?.isFullAccess || FULL_ACCESS_ROLES.includes(role),
    user?.email
  );
  const groupedLinks = groupModuleLinks(links);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  useEffect(() => {
    const handler = () => setIsMobileMenuOpen((prev) => !prev);
    window.addEventListener('toggle-mobile-menu', handler);
    return () => window.removeEventListener('toggle-mobile-menu', handler);
  }, []);

  useEffect(() => {
    return () => { if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current); };
  }, []);

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const newCount = logoClicks + 1;
    setLogoClicks(newCount);
    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    clickTimeoutRef.current = setTimeout(() => setLogoClicks(0), 2000);
    if (newCount === 10) {
      setIsLogoSpinning(true);
      setLogoClicks(0);
      setTimeout(() => setIsLogoSpinning(false), 1000);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div className="mezon-mobile-overlay" onClick={closeMobileMenu} />
      )}

        <aside className={clsx("mezon-sidenav", isMobileMenuOpen && "mezon-sidenav--mobile-open")} role="navigation" aria-label="Основная навигация">
          {/* Brand */}
          <div className="mezon-sidenav__brand">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 cursor-pointer" onClick={handleLogoClick}>
                <img
                  src={tenant.logoUrl}
                  alt={tenant.name}
                className={clsx(
                  "transition-transform",
                  isLogoSpinning && "animate-spin-flip"
                )}
                style={{ transformStyle: 'preserve-3d' }}
                />
              </div>
              <button
              className="mezon-mobile-close p-2 min-h-[44px] min-w-[44px]"
              onClick={closeMobileMenu}
              aria-label="Закрыть меню"
            >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mezon-sidenav__brand-copy">
              <span className="mezon-chip mezon-chip--soft">
                <Sparkles className="h-3.5 w-3.5" />
                ERP workspace
              </span>
              <strong>{tenant.name}</strong>
              <p>Спокойный единый интерфейс для операционных задач, обучения и сервиса.</p>
            </div>
          </div>

          {/* User card */}
          <div className="mezon-sidenav__user">
            <strong>{userName}</strong>
            <span>{ROLE_LABELS[role] ?? role}{permissionsLoading ? " · загрузка прав…" : ""}</span>
          </div>

          {/* Navigation */}
          <div className="mezon-sidenav__nav">
            {groupedLinks.map((group) => (
              <section key={group.id} className="mezon-nav-group" aria-label={group.label}>
                <p className="mezon-nav-label">{group.label}</p>
                <div className="mezon-nav-group__list">
                  {group.links.map((l) => {
                    const isActive = loc.pathname === l.path || loc.pathname.startsWith(`${l.path}/`);

                    if (l.isExternal) {
                      return (
                        <a
                          key={l.path}
                          href={l.path}
                          className="mezon-nav-link"
                          onClick={closeMobileMenu}
                        >
                          {l.icon && <l.icon className="mezon-nav-link__icon" />}
                          <span>{l.label}</span>
                        </a>
                      );
                    }

                    return (
                      <Link
                        key={l.path}
                        to={l.path}
                        className={clsx("mezon-nav-link", isActive && "mezon-nav-link--active")}
                        onClick={closeMobileMenu}
                      >
                        {l.icon && <l.icon className="mezon-nav-link__icon" />}
                        <span>{l.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          {/* Footer */}
          <div className="mezon-sidenav__footer">
            <div className="mezon-sidenav__support-card">
              <div className="mezon-sidenav__support-icon">
                <LifeBuoy className="h-4 w-4" />
              </div>
              <div className="mezon-sidenav__support-copy">
                <strong>Поддержка и переходы</strong>
                <span>{tenant.supportPhone || tenant.supportEmail || "Контакты поддержки появятся после загрузки тенанта."}</span>
              </div>
              <Link to="/lms" className="mezon-sidenav__support-link" onClick={closeMobileMenu}>
                LMS
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          <Button type="button" className="mt-3 w-full" variant="outline" size="sm" onClick={logout}>
            Выйти
          </Button>
        </div>
      </aside>
    </>
  );
}
