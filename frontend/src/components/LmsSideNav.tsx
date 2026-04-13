import { useEffect, useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { X } from "lucide-react";
import { Button } from "./ui/button";
import { useAuth } from "../hooks/useAuth";
import { useDemo } from "../contexts/DemoContext";
import { useTenant } from "../contexts/TenantContext";
import type { UserRole } from "../types/auth";

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
 const links = [
 { path:"/lms/school", label:"Дашборд", roles: ["DEVELOPER","ADMIN","DIRECTOR","DEPUTY","TEACHER","ACCOUNTANT","ZAVHOZ"]},
 { path:"/lms/school/classes", label:"Мои Классы", roles: ["DEVELOPER","ADMIN","DIRECTOR","DEPUTY","TEACHER"]},
 { path:"/lms/school/schedule", label:"Расписание", roles: ["DEVELOPER","ADMIN","DIRECTOR","DEPUTY","TEACHER","ACCOUNTANT","ZAVHOZ"]},
 { path:"/lms/school/gradebook", label:"Журнал оценок", roles: ["DEVELOPER","ADMIN","DIRECTOR","DEPUTY","TEACHER"]},
 { path:"/lms/school/homework", label:"Домашние задания", roles: ["DEVELOPER","ADMIN","DIRECTOR","DEPUTY","TEACHER"]},
 { path:"/lms/school/attendance", label:"Посещаемость", roles: ["DEVELOPER","ADMIN","DIRECTOR","DEPUTY","TEACHER"]},
 { path:"/lms/ai-assistant", label:"🤖 ИИ Методист", roles: ["DEVELOPER","ADMIN","DIRECTOR","DEPUTY","TEACHER"]},
 // Student/Parent links (simulated for now, as roles are strict)
 { path:"/lms/diary", label:"Дневник", roles: ["STUDENT","PARENT"]}, // Placeholder roles
 ];

 const filteredLinks = links.filter(l => l.roles.includes(role) || l.roles.includes("STUDENT")); // Allow all for dev/demo if needed, or strictly filter

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
        <p className="font-semibold text-[13px] mt-2 text-macos-blue">ШКОЛА (LMS)</p>
      </div>

 <div className="mezon-sidenav__nav">
 <p className="mezon-nav-label">Учебный процесс</p>
 <div className="flex flex-col gap-1">
 {filteredLinks.map((l) => {
 const isActive = loc.pathname === l.path || (l.path !== '/lms/school' && loc.pathname.startsWith(l.path));
 return (
 <Link 
 key={l.path} 
 to={l.path} 
 className={clsx("mezon-nav-link", isActive &&"mezon-nav-link--active")}
 onClick={closeMobileMenu}
 > 
 {l.label}
 </Link>
 );
})}
 </div>
 </div>

 <div className="mezon-sidenav__footer">
 <Button type="button"className="mt-4 w-full"variant="outline"onClick={handleLogout}>
 Выйти
 </Button>
 </div>
 </aside>
 </>
 );
}
