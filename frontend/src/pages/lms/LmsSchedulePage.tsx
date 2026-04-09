// src/pages/lms/LmsSchedulePage.tsx
import { useEffect, useState} from"react";
import {
 Calendar,
 MapPin,
 Users,
 Plus,
} from"lucide-react";
import { lmsApi} from"../../lib/lms-api";
import { useAuth} from"../../hooks/useAuth";
import type { LmsSchoolClass, LmsSubject, LmsScheduleItem} from"../../types/lms";
import { toast} from"sonner";
import { useLmsClasses} from"../../hooks/lms/useLmsClasses";
import { useLmsSubjects} from"../../hooks/lms/useLmsSubjects";
import { useLmsSchedule} from"../../hooks/lms/useLmsSchedule";

const DAYS = ["Понедельник","Вторник","Среда","Четверг","Пятница","Суббота"];
const TIME_SLOTS = [
 { start:"08:30", end:"09:15"},
 { start:"09:25", end:"10:10"},
 { start:"10:30", end:"11:15"},
 { start:"11:25", end:"12:10"},
 { start:"12:30", end:"13:15"},
 { start:"13:25", end:"14:10"},
 { start:"14:20", end:"15:05"},
 { start:"15:15", end:"16:00"},
];

export default function LmsSchedulePage() {
 const { user} = useAuth();
 const { classes, loading: classesLoading, error: classesError} = useLmsClasses({ isActive: true});
 const { subjects, loading: subjectsLoading, error: subjectsError} = useLmsSubjects();
 const [selectedClass, setSelectedClass] = useState<number | null>(null);
 const { schedule, loading: scheduleLoading, error: scheduleError, refetch: refetchSchedule} = useLmsSchedule(selectedClass);
 const [showAddModal, setShowAddModal] = useState(false);
 const [selectedSlot, setSelectedSlot] = useState<{ day: number; time: string} | null>(null);

 const isAdmin = user && ["DIRECTOR","DEPUTY","ADMIN"].includes(user.role);

 useEffect(() => {
 if (classes.length > 0 && !selectedClass) {
 setSelectedClass(classes[0].id);
}
}, [classes, selectedClass]);

 useEffect(() => {
 const err = classesError || subjectsError || scheduleError;
 if (err) {
 console.error("Failed to load schedule data:", err);
 toast.error("Не удалось загрузить данные расписания");
}
}, [classesError, subjectsError, scheduleError]);

 const getScheduleForSlot = (dayOfWeek: number, startTime: string) => {
 return schedule.find(
 (s) => s.dayOfWeek === dayOfWeek && s.startTime === startTime
 );
};

 const handleDeleteScheduleItem = async (id: string) => {
 if (!confirm("Удалить этот урок из расписания?")) return;
 try {
 await lmsApi.deleteScheduleItem(id);
 toast.success("Урок удален из расписания");
 refetchSchedule();
} catch (error) {
 toast.error("Не удалось удалить урок");
}
};

 const loading = classesLoading || subjectsLoading || (selectedClass ? scheduleLoading : false);

 if (loading) {
 return (
 <div className="flex items-center justify-center min-h-[400px]">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
 </div>
 );
}

 return (
 <div className="space-y-6">
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
 <div>
 <h1 className="text-[24px] font-bold tracking-[-0.025em] leading-tight text-primary">Расписание уроков</h1>
 <p className="text-secondary">Недельное расписание занятий</p>
 </div>
 {isAdmin && selectedClass && (
 <button
 onClick={() => setShowAddModal(true)}
 className="inline-flex items-center gap-2 bg-macos-blue text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 macos-transition"
 >
 <Plus className="h-5 w-5"/>
 Добавить урок
 </button>
 )}
 </div>

 <div className="bg-white rounded-xl shadow-subtle border border-card p-4">
 <div className="flex items-center gap-4">
 <label className="text-[11px] font-medium uppercase tracking-widest text-primary">
 <Users className="inline h-4 w-4 mr-1"/>
 Класс:
 </label>
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
 </div>

 {selectedClass ? (
 <div className="bg-white rounded-xl shadow-subtle border border-card overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full min-w-[800px]">
 <thead className="bg-fill-quaternary">
 <tr>
 <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-widest text-primary w-20">
 Время
 </th>
 {DAYS.map((day) => (
 <th key={day} className="px-2 py-3 text-center text-[11px] font-medium uppercase tracking-widest text-primary">
 {day}
 </th>
 ))}
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100">
 {TIME_SLOTS.map((slot) => (
 <tr key={slot.start} className="hover:bg-fill-quaternary">
 <td className="px-4 py-3 text-sm text-secondary">
 <div className="font-medium">{slot.start}</div>
 <div className="text-xs text-tertiary">{slot.end}</div>
 </td>
 {DAYS.map((_, dayIdx) => {
 const item = getScheduleForSlot(dayIdx + 1, slot.start);
 return (
 <td key={dayIdx} className="px-2 py-2">
 {item ? (
 <div
 className="p-2 rounded-lg text-sm cursor-pointer hover:opacity-80 macos-transition bg-tint-blue border-l-4 border-teal-500"
 onClick={() => isAdmin && handleDeleteScheduleItem(item.id)}
 >
 <div className="font-medium text-primary truncate">
 {item.subject?.name ||"Предмет"}
 </div>
 {item.room && (
 <div className="text-xs text-secondary flex items-center gap-1 mt-1">
 <MapPin className="h-3 w-3"/>
 {item.room}
 </div>
 )}
 {item.teacher && (
 <div className="text-xs text-secondary truncate mt-1">
 {item.teacher.lastName} {item.teacher.firstName?.charAt(0)}.
 </div>
 )}
 </div>
 ) : (
 isAdmin && (
 <button
 onClick={() => {
 setSelectedSlot({ day: dayIdx + 1, time: slot.start});
 setShowAddModal(true);
}}
 className="w-full h-full min-h-[60px] rounded-lg border-2 border-dashed border-[rgba(0,0,0,0.08)] hover:border-teal-500 hover:bg-tint-blue macos-transition flex items-center justify-center"
 >
 <Plus className="h-4 w-4 text-tertiary"/>
 </button>
 )
 )}
 </td>
 );
})}
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 ) : (
 <div className="bg-white rounded-xl shadow-subtle border border-card p-12 text-center">
 <Calendar className="h-12 w-12 text-tertiary mx-auto mb-4"/>
 <p className="text-secondary">Выберите класс для просмотра расписания</p>
 </div>
 )}

 {showAddModal && selectedClass && (
 <AddScheduleModal
 classId={selectedClass}
 subjects={subjects}
 defaultDay={selectedSlot?.day}
 defaultTime={selectedSlot?.time}
 timeSlots={TIME_SLOTS}
 onClose={() => {
 setShowAddModal(false);
 setSelectedSlot(null);
}}
 onCreated={() => {
 setShowAddModal(false);
 setSelectedSlot(null);
 refetchSchedule();
}}
 />
 )}
 </div>
 );
}

function AddScheduleModal({
 classId,
 subjects,
 defaultDay,
 defaultTime,
 timeSlots,
 onClose,
 onCreated,
}: {
 classId: number;
 subjects: LmsSubject[];
 defaultDay?: number;
 defaultTime?: string;
 timeSlots: { start: string; end: string}[];
 onClose: () => void;
 onCreated: () => void;
}) {
 const { user} = useAuth();
 const [formData, setFormData] = useState({
 subjectId: subjects[0]?.id ||"",
 teacherId: user?.id || 0,
 dayOfWeek: defaultDay || 1,
 startTime: defaultTime || timeSlots[0].start,
 endTime: timeSlots.find(t => t.start === defaultTime)?.end || timeSlots[0].end,
 room:"",
});
 const [loading, setLoading] = useState(false);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setLoading(true);
 try {
 await lmsApi.createScheduleItem({
 classId,
 subjectId: formData.subjectId,
 teacherId: formData.teacherId,
 dayOfWeek: formData.dayOfWeek,
 startTime: formData.startTime,
 endTime: formData.endTime,
 room: formData.room,
});
 toast.success("Урок добавлен в расписание");
 onCreated();
} catch (error) {
 toast.error("Не удалось добавить урок");
} finally {
 setLoading(false);
}
};

 return (
 <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
 <h2 className="text-[24px] font-bold tracking-[-0.025em] leading-tight text-primary mb-4">Добавить урок в расписание</h2>
 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest text-primary mb-1">
 Предмет
 </label>
 <select
 value={formData.subjectId}
 onChange={(e) => setFormData({ ...formData, subjectId: e.target.value})}
 className="w-full px-3 py-2 mezon-field rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-macos-blue/30"
 >
 {subjects.map((s) => (
 <option key={s.id} value={s.id}>
 {s.name}
 </option>
 ))}
 </select>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest text-primary mb-1">
 День недели
 </label>
 <select
 value={formData.dayOfWeek}
 onChange={(e) => setFormData({ ...formData, dayOfWeek: Number(e.target.value)})}
 className="w-full px-3 py-2 mezon-field rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-macos-blue/30"
 >
 {DAYS.map((day, idx) => (
 <option key={idx} value={idx + 1}>
 {day}
 </option>
 ))}
 </select>
 </div>
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest text-primary mb-1">
 Время
 </label>
 <select
 value={formData.startTime}
 onChange={(e) => {
 const slot = timeSlots.find(t => t.start === e.target.value);
 setFormData({ 
 ...formData, 
 startTime: e.target.value,
 endTime: slot?.end || e.target.value,
});
}}
 className="w-full px-3 py-2 mezon-field rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-macos-blue/30"
 >
 {timeSlots.map((slot) => (
 <option key={slot.start} value={slot.start}>
 {slot.start} - {slot.end}
 </option>
 ))}
 </select>
 </div>
 </div>
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest text-primary mb-1">
 Кабинет
 </label>
 <input
 type="text"
 value={formData.room}
 onChange={(e) => setFormData({ ...formData, room: e.target.value})}
 className="w-full px-3 py-2 mezon-field rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-macos-blue/30"
 placeholder="Каб. 101"
 />
 </div>
 <div className="flex gap-3 pt-4">
 <button
 type="button"
 onClick={onClose}
 className="flex-1 px-4 py-2 mezon-field rounded-lg text-primary hover:bg-fill-quaternary macos-transition"
 >
 Отмена
 </button>
 <button
 type="submit"
 disabled={loading}
 className="flex-1 px-4 py-2 bg-macos-blue text-white rounded-lg font-medium hover:bg-macos-blue macos-transition disabled:opacity-50"
 >
 {loading ?"Добавление...":"Добавить"}
 </button>
 </div>
 </form>
 </div>
 </div>
 );
}
