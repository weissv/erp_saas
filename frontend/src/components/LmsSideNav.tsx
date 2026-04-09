import { useState, useRef} from"react";
import { Link, useLocation, useNavigate} from"react-router-dom";
import clsx from"clsx";
import { Facebook, Instagram, Send, X} from"lucide-react";
import { Button} from"./ui/button";
import { useAuth} from"../hooks/useAuth";
import type { UserRole} from"../types/auth";

export default function LmsSideNav() {
 const { user, logout} = useAuth();
 const loc = useLocation();
 const navigate = useNavigate();
 const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
 const [logoClicks, setLogoClicks] = useState(0);
 const [isLogoSpinning, setIsLogoSpinning] = useState(false);
 const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
 const role = (user?.role ||"TEACHER") as UserRole;

 const closeMobileMenu = () => setIsMobileMenuOpen(false);
 
 if (typeof window !== 'undefined') {
 (window as any).toggleMobileMenu = () => setIsMobileMenuOpen(prev => !prev);
}

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

 const handleLogout = () => {
 logout();
 navigate("/auth/login");
};

 const socialLinks = [
 { icon: Facebook, href:"https://www.facebook.com/MezonSchool/"},
 { icon: Instagram, href:"https://instagram.com/mezonschool"},
 { icon: Send, href:"http://t.me/mezon_school"},
 ];

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
 
 <aside className={clsx("mezon-sidenav", isMobileMenuOpen &&"mezon-sidenav--mobile-open")}>
 <div className="mezon-sidenav__brand">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3 cursor-pointer"onClick={handleLogoClick}>
 <img 
 src="/logo.png"
 alt="Mezon"
 className={clsx(
"transition-transform 0",
 isLogoSpinning &&"animate-spin-flip"
 )}
 style={{
 transformStyle: 'preserve-3d',
}}
 />
 </div>
 <button 
 className="mezon-mobile-close"
 onClick={closeMobileMenu}
 aria-label="Close menu"
 >
 <X className="h-6 w-6"/>
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
 <div className="mt-2 mezon-top-bar__social">
 {socialLinks.map(({ icon: Icon, href}) => (
 <a key={href} href={href} target="_blank"rel="noreferrer">
 <Icon className="h-4 w-4"/>
 </a>
 ))}
 </div>
 <Button type="button"className="mt-4 w-full"variant="outline"onClick={handleLogout}>
 Выйти
 </Button>
 </div>
 </aside>
 </>
 );
}
