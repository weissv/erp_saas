import { useEffect, useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
import {
  ArrowRight,
  BookOpen,
  Bot,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  NotebookTabs,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { Button } from "./ui/button";
import { useAuth } from "../hooks/useAuth";
import { useDemo } from "../contexts/DemoContext";
import { useTenant } from "../contexts/TenantContext";
import type { UserRole } from "../types/auth";
import { ROLE_LABELS } from "../types/auth";

export default function LmsSideNav() {
 const { user, logout} = useAuth();
 const { isDemo } = useDemo();
 const { tenant} = useTenant();
 const loc = useLocation();
 const navigate = useNavigate();
 const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
 const [logoClicks, setLogoClicks] = useState(0);
 const [isLogoSpinning, setIsLogoSpinning] = useState(false);
 const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
 const role = (user?.role ||"TEACHER") as UserRole;

 const closeMobileMenu = () => setIsMobileMenuOpen(false);

  useEffect(() => {
    const handler = () => setIsMobileMenuOpen((prev) => !prev);
    window.addEventListener('toggle-mobile-menu', handler);
    return () => window.removeEventListener('toggle-mobile-menu', handler);
  }, []);

  const handleLogoClick = (e: React.MouseEvent) => {
 e.preventDefault();
 const newClickCount = logoClicks + 1;
 setLogoClicks(newClickCount);

 if (clickTimeoutRef.current) {
 clearTimeout(clickTimeoutRef.current);
}

 clickTimeoutRef.current = setTimeout(() => {
 setLogoClicks(0);
}, 2000);

 if (newClickCount === 10) {
 setIsLogoSpinning(true);
 setLogoClicks(0);
 setTimeout(() => {
 setIsLogoSpinning(false);
}, 1000);
}
};

 const handleLogout = async () => {
 await logout();
 closeMobileMenu();
 navigate(isDemo ? "/school" : "/auth/login", { replace: true });
};

 // Define LMS Navigation Links based on Role
  const navGroups = [
    {
      id: "core",
      label: "Учебный контур",
      links: [
        { path: "/lms/school", label: "Дашборд", icon: LayoutDashboard, roles: ["DEVELOPER", "ADMIN", "DIRECTOR", "DEPUTY", "TEACHER", "ACCOUNTANT", "ZAVHOZ"] },
        { path: "/lms/school/classes", label: "Мои классы", icon: Users, roles: ["DEVELOPER", "ADMIN", "DIRECTOR", "DEPUTY", "TEACHER"] },
        { path: "/lms/school/schedule", label: "Расписание", icon: CalendarDays, roles: ["DEVELOPER", "ADMIN", "DIRECTOR", "DEPUTY", "TEACHER", "ACCOUNTANT", "ZAVHOZ"] },
        { path: "/lms/school/gradebook", label: "Журнал оценок", icon: NotebookTabs, roles: ["DEVELOPER", "ADMIN", "DIRECTOR", "DEPUTY", "TEACHER"] },
      ],
    },
    {
      id: "engagement",
      label: "Взаимодействие",
      links: [
        { path: "/lms/school/homework", label: "Домашние задания", icon: BookOpen, roles: ["DEVELOPER", "ADMIN", "DIRECTOR", "DEPUTY", "TEACHER"] },
        { path: "/lms/school/attendance", label: "Посещаемость", icon: GraduationCap, roles: ["DEVELOPER", "ADMIN", "DIRECTOR", "DEPUTY", "TEACHER"] },
        { path: "/lms/ai-assistant", label: "ИИ-методист", icon: Bot, roles: ["DEVELOPER", "ADMIN", "DIRECTOR", "DEPUTY", "TEACHER"] },
        { path: "/lms/diary", label: "Дневник", icon: BookOpen, roles: ["DEVELOPER", "ADMIN", "DIRECTOR", "DEPUTY", "TEACHER"] },
      ],
    },
  ];

  const filteredGroups = navGroups
    .map((group) => ({
      ...group,
      links: group.links.filter((link) => link.roles.includes(role)),
    }))
    .filter((group) => group.links.length > 0);

  return (
 <>
 {isMobileMenuOpen && (
 <div 
 className="mezon-mobile-overlay"
 onClick={closeMobileMenu}
 />
 )}
 
  <aside className={clsx("mezon-sidenav", isMobileMenuOpen &&"mezon-sidenav--mobile-open")} role="navigation" aria-label="Навигация LMS">
  <div className="mezon-sidenav__brand">
  <div className="flex items-center justify-between">
 <div className="flex items-center gap-3 cursor-pointer"onClick={handleLogoClick}>
 <img 
 src={tenant.logoUrl}
 alt={tenant.name}
 className={clsx(
"transition-transform",
 isLogoSpinning &&"animate-spin-flip"
 )}
 style={{
 transformStyle: 'preserve-3d',
}}
 />
 </div>
  <button 
 className="mezon-mobile-close p-2 min-h-[44px] min-w-[44px]"
 onClick={closeMobileMenu}
 aria-label="Закрыть меню"
 >
  <X className="h-5 w-5"/>
  </button>
         </div>
        <div className="mezon-sidenav__brand-copy">
          <span className="mezon-chip mezon-chip--soft">
            <Sparkles className="h-3.5 w-3.5" />
            LMS workspace
          </span>
          <strong>{tenant.name}</strong>
          <p>Учебные сценарии, расписание и коммуникация в одном аккуратном контуре.</p>
        </div>
      </div>

  <div className="mezon-sidenav__user">
    <strong>{user?.employee?.firstName || user?.email || "Пользователь"}</strong>
    <span>{ROLE_LABELS[role] ?? role}</span>
  </div>

  <div className="mezon-sidenav__nav">
  {filteredGroups.map((group) => (
  <section key={group.id} className="mezon-nav-group" aria-label={group.label}>
  <p className="mezon-nav-label">{group.label}</p>
  <div className="mezon-nav-group__list">
  {group.links.map((l) => {
  const isActive = loc.pathname === l.path || (l.path !== '/lms/school' && loc.pathname.startsWith(l.path));
  return (
  <Link 
  key={l.path} 
  to={l.path} 
  className={clsx("mezon-nav-link", isActive &&"mezon-nav-link--active")}
  onClick={closeMobileMenu}
  > 
  <l.icon className="mezon-nav-link__icon" />
  <span>{l.label}</span>
  </Link>
  );
})}
  </div>
  </section>
  ))}
  </div>

  <div className="mezon-sidenav__footer">
  <div className="mezon-sidenav__support-card">
    <div className="mezon-sidenav__support-icon">
      <LifeBuoy className="h-4 w-4" />
    </div>
    <div className="mezon-sidenav__support-copy">
      <strong>ERP и поддержка</strong>
      <span>{tenant.supportPhone || tenant.supportEmail || "Контакты поддержки появятся после загрузки тенанта."}</span>
    </div>
    <Link to="/dashboard" className="mezon-sidenav__support-link" onClick={closeMobileMenu}>
      ERP
      <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  </div>
  <Button type="button"className="mt-4 w-full"variant="outline"onClick={handleLogout}>
  Выйти
  </Button>
 </div>
 </aside>
 </>
 );
}
