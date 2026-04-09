// src/pages/lms/LmsDiaryPage.tsx
import { useState, useEffect} from"react";
import { format, startOfWeek, addDays, isSameDay} from"date-fns";
import { ru} from"date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar, BookOpen} from"lucide-react";
import { Button} from"../../components/ui/button";
import { lmsApi} from"../../lib/lms-api";
import { useAuth} from"../../hooks/useAuth";
import type { LmsScheduleItem, LmsSchoolClass} from"../../types/lms";
import { toast} from"sonner";

export default function LmsDiaryPage() {
 const { user} = useAuth();
 const [currentDate, setCurrentDate] = useState(new Date());
 const [schedule, setSchedule] = useState<LmsScheduleItem[]>([]);
 const [classes, setClasses] = useState<LmsSchoolClass[]>([]);
 const [selectedClass, setSelectedClass] = useState<number | null>(null);
 const [loading, setLoading] = useState(false);

 // Determine start of the week (Monday)
 const weekStart = startOfWeek(currentDate, { weekStartsOn: 1});
 const weekDays = Array.from({ length: 6}, (_, i) => addDays(weekStart, i)); // Mon-Sat

 const nextWeek = () => setCurrentDate(addDays(currentDate, 7));
 const prevWeek = () => setCurrentDate(addDays(currentDate, -7));
 const today = () => setCurrentDate(new Date());

 useEffect(() => {
 fetchClasses();
}, []);

 useEffect(() => {
 if (selectedClass) {
 fetchSchedule();
}
}, [currentDate, selectedClass]);

 const fetchClasses = async () => {
 try {
 const data = await lmsApi.getClasses({ isActive: true});
 setClasses(data);
 if (data.length > 0) {
 setSelectedClass(data[0].id);
}
} catch (error) {
 console.error("Failed to fetch classes", error);
}
};

 const fetchSchedule = async () => {
 if (!selectedClass) return;
 setLoading(true);
 try {
 const data = await lmsApi.getSchedule({ classId: selectedClass});
 setSchedule(data);
} catch (error) {
 console.error("Failed to fetch schedule", error);
 toast.error("Не удалось загрузить расписание");
} finally {
 setLoading(false);
}
};

 const getScheduleForDay = (dayOfWeek: number) => {
 return schedule
 .filter((s) => s.dayOfWeek === dayOfWeek)
 .sort((a, b) => a.startTime.localeCompare(b.startTime));
};

 return (
 <div className="space-y-6">
 <div>
 <h1 className="text-[24px] font-bold tracking-[-0.025em] leading-tight text-primary">Дневник</h1>
 <p className="text-secondary mt-1">
 Расписание на неделю
 </p>
 </div>

 {/* Week Navigation and Class Selector */}
 <div className="bg-white rounded-xl shadow-subtle border border-card p-4">
 <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
 <div className="flex items-center gap-2">
 <select
 value={selectedClass ||""}
 onChange={(e) => setSelectedClass(e.target.value ? Number(e.target.value) : null)}
 className="px-3 py-2 mezon-field rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-macos-blue/30"
 >
 <option value="">Выберите класс</option>
 {classes.map((cls) => (
 <option key={cls.id} value={cls.id}>
 {cls.name}
 </option>
 ))}
 </select>
 </div>
 
 <div className="flex items-center gap-4">
 <Button variant="outline"size="sm"onClick={prevWeek}>
 <ChevronLeft className="h-4 w-4"/>
 </Button>
 <span className="font-medium text-primary min-w-[200px] text-center">
 {format(weekStart,"d MMMM", { locale: ru})} -{""}
 {format(addDays(weekStart, 5),"d MMMM yyyy", { locale: ru})}
 </span>
 <Button variant="outline"size="sm"onClick={nextWeek}>
 <ChevronRight className="h-4 w-4"/>
 </Button>
 <Button variant="outline"size="sm"onClick={today}>
 Сегодня
 </Button>
 </div>
 </div>
 </div>

 {/* Weekly Schedule */}
 {loading ? (
 <div className="flex items-center justify-center min-h-[200px]">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
 </div>
 ) : !selectedClass ? (
 <div className="bg-white rounded-xl shadow-subtle border border-card p-12 text-center">
 <Calendar className="h-12 w-12 text-tertiary mx-auto mb-4"/>
 <p className="text-secondary">Выберите класс для просмотра дневника</p>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {weekDays.map((day, index) => {
 const dayOfWeek = index + 1; // 1 = Monday
 const daySchedule = getScheduleForDay(dayOfWeek);
 const isToday = isSameDay(day, new Date());

 return (
 <div
 key={day.toISOString()}
 className={`bg-white rounded-xl shadow-subtle border border-card overflow-hidden ${
 isToday ?"ring-2 ring-teal-500":""
}`}
 >
 <div
 className={`px-4 py-3 ${
 isToday
 ?"bg-macos-blue text-white"
 :"bg-fill-quaternary text-primary"
}`}
 >
 <div className="font-semibold">
 {format(day,"EEEE", { locale: ru})}
 </div>
 <div className={`text-sm ${isToday ?"text-teal-100":"text-secondary"}`}>
 {format(day,"d MMMM", { locale: ru})}
 </div>
 </div>

 <div className="p-4">
 {daySchedule.length === 0 ? (
 <div className="text-center text-tertiary py-6">
 <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50"/>
 <p className="text-sm">Нет уроков</p>
 </div>
 ) : (
 <div className="space-y-3">
 {daySchedule.map((item) => (
 <div
 key={item.id}
 className="flex items-start gap-3 p-2 rounded-lg bg-fill-quaternary hover:bg-fill-tertiary macos-transition"
 >
 <div className="text-xs text-secondary font-mono mt-0.5 min-w-[45px]">
 {item.startTime}
 </div>
 <div className="flex-1 min-w-0">
 <div className="font-medium text-primary truncate">
 {item.subject?.name ||"Предмет"}
 </div>
 {item.room && (
 <div className="text-xs text-secondary">
 Каб. {item.room}
 </div>
 )}
 {item.teacher && (
 <div className="text-xs text-secondary">
 {item.teacher.lastName} {item.teacher.firstName?.charAt(0)}.
 </div>
 )}
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 );
})}
 </div>
 )}
 </div>
 );
}
