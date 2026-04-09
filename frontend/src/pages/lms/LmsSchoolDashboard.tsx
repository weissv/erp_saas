import { useState, useEffect} from 'react';
import { Link} from 'react-router-dom';
import { Users, BookOpen, Calendar, Award, AlertCircle, Clock, CheckCircle2} from 'lucide-react';
import { api} from '../../lib/api';
import { useAuth} from '../../hooks/useAuth';
import { Button} from '../../components/ui/button';
import type { SchoolStats} from '../../types/lms';

type KPIColor = 'blue' | 'green' | 'purple' | 'orange';

function KPICard({
 title,
 value,
 subtitle,
 icon: Icon,
 color = 'blue',
}: {
 title: string;
 value: string | number;
 subtitle?: string;
 icon: typeof Users;
 color?: KPIColor;
}) {
 const colorClasses = {
 blue: 'bg-[rgba(10,132,255,0.12)] text-macos-blue',
 green: 'bg-[rgba(52,199,89,0.14)] text-[var(--macos-green)]',
 purple: 'bg-[rgba(191,90,242,0.14)] text-[var(--macos-purple)]',
 orange: 'bg-[rgba(255,149,0,0.14)] text-[var(--macos-orange)]',
}[color];

 return (
 <div className="mezon-card">
 <div className="flex items-start justify-between">
 <div>
 <p className="text-[11px] font-medium uppercase tracking-widest text-secondary">{title}</p>
 <h3 className="mt-1 text-[24px] font-bold tracking-[-0.025em] leading-tight text-primary">{value}</h3>
 {subtitle && <p className="mt-1 text-xs text-[var(--mezon-text-soft)]">{subtitle}</p>}
 </div>
 <div className={`p-3 rounded-xl ${colorClasses}`}>
 <Icon className="h-6 w-6"/>
 </div>
 </div>
 </div>
 );
}

export default function LmsSchoolDashboard() {
 const { user} = useAuth();
 const [stats, setStats] = useState<SchoolStats | null>(null);
 const [loading, setLoading] = useState(true);
 const teacherName = user?.employee
 ? `${user.employee.firstName} ${user.employee.lastName}`
 : user?.email;

 useEffect(() => {
 const fetchStats = async () => {
 try {
 const res = await api.get('/lms/school/school-stats');
 setStats(res as SchoolStats);
} catch (error) {
 console.error("Failed to fetch stats", error);
} finally {
 setLoading(false);
}
};

 fetchStats();
}, []);

 if (loading) {
 return <div className="mezon-card h-64 animate-pulse text-secondary">Загрузка статистики...</div>;
}

 return (
 <div className="space-y-8">
 <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
 <div>
 <div className="mezon-badge mb-3">LMS · школьная аналитика</div>
 <h1 className="mezon-section-title mb-1">Школьный обзор</h1>
 <p className="mezon-subtitle">
 Сводка по учебному процессу на сегодня{teacherName ? `для ${teacherName}`: ''}.
 </p>
 </div>
 <div className="flex gap-2">
 <Link to="/lms/school/schedule">
 <Button variant="outline">Расписание</Button>
 </Link>
 <Link to="/lms/diary">
 <Button>Мой дневник</Button>
 </Link>
 </div>
 </div>

 {/* KPI Cards */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
 <KPICard 
 title="Учеников"
 value={stats?.totalStudents || 0} 
 subtitle="Всего в школе"
 icon={Users} 
 color="blue"
 />
 <KPICard 
 title="Посещаемость"
 value={`${stats?.attendanceStats?.present || 0}`} 
 subtitle="Присутствует сегодня"
 icon={CheckCircle2} 
 color="green"
 />
 <KPICard 
 title="Уроков сегодня"
 value="42"
 subtitle="По расписанию"
 icon={Calendar} 
 color="purple"
 />
 <KPICard 
 title="Средний балл"
 value="4.5"
 subtitle="За неделю"
 icon={Award} 
 color="orange"
 />
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 {/* Recent Activity / Grades */}
 <div className="lg:col-span-2 space-y-6">
 <div className="flex items-center justify-between">
 <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-primary">Последние оценки</h2>
 <Link to="/lms/school/gradebook"className="text-sm text-macos-blue hover:underline">Все оценки</Link>
 </div>
 
 <div className="mezon-card p-0 overflow-hidden">
 {stats?.recentGrades?.length ? (
 <div className="divide-y divide-[rgba(60,60,67,0.08)]">
 {stats.recentGrades.map((g) => {
 const gradeValue = g.value ?? 0;
 const studentName = g.student?.student
 ? `${g.student.student.firstName} ${g.student.student.lastName}`
 : '—';
 const subjectName = g.subject?.name ?? '—';
 const gradeColor = gradeValue >= 90
 ? 'bg-[var(--macos-green)]'
 : gradeValue >= 75
 ? 'bg-macos-blue'
 : 'bg-[var(--macos-orange)]';

 return (
 <div key={g.id} className="flex items-center justify-between p-4 macos-transition hover:bg-[rgba(255,255,255,0.55)]">
 <div className="flex items-center gap-3">
 <div className={`
 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white
 ${gradeColor}
 `}>
 {gradeValue}
 </div>
 <div>
 <p className="font-medium text-primary">{studentName}</p>
 <p className="text-xs text-secondary">{subjectName} • {new Date(g.date).toLocaleDateString()}</p>
 </div>
 </div>
 {g.comment && (
 <span className="hidden max-w-[200px] truncate text-sm italic text-[var(--mezon-text-soft)] sm:block">{g.comment}</span>
 )}
 </div>
 );
})}
 </div>
 ) : (
 <div className="p-8 text-center text-secondary">Нет свежих оценок</div>
 )}
 </div>
 </div>

 {/* Upcoming Homework / Events */}
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-primary">Ближайшие события</h2>
 </div>
 
 <div className="mezon-card">
 <div className="space-y-4">
 <div className="flex items-start gap-3 border-b border-[rgba(60,60,67,0.08)] pb-4 last:border-0 last:pb-0">
 <div className="rounded-lg bg-[rgba(255,59,48,0.12)] p-2 text-[var(--macos-red)]">
 <AlertCircle className="h-5 w-5"/>
 </div>
 <div>
 <p className="font-medium text-primary">Родительское собрание</p>
 <p className="mt-1 text-sm text-secondary">10 декабря, 18:00. Актовый зал.</p>
 </div>
 </div>
 <div className="flex items-start gap-3 border-b border-[rgba(60,60,67,0.08)] pb-4 last:border-0 last:pb-0">
 <div className="rounded-lg bg-[rgba(10,132,255,0.12)] p-2 text-macos-blue">
 <Clock className="h-5 w-5"/>
 </div>
 <div>
 <p className="font-medium text-primary">Контрольная работа</p>
 <p className="mt-1 text-sm text-secondary">Математика, 5А класс. Завтра.</p>
 </div>
 </div>
 </div>
 </div>


 </div>
 </div>
 </div>
 );
}
