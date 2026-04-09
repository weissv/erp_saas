// src/pages/lms/LmsProgressPage.tsx
import { useState, useEffect} from"react";
import {
 CheckCircle2,
 XCircle,
 Clock,
 AlertCircle,
 Calendar,
 Filter,
} from"lucide-react";
import { lmsApi} from"../../lib/lms-api";
import { LmsStudentAttendance} from"../../types/lms";
import { toast} from"sonner";

export default function LmsProgressPage() {
 const [attendance, setAttendance] = useState<LmsStudentAttendance[]>([]);
 const [loading, setLoading] = useState(true);
 const [filter, setFilter] = useState("all");

 useEffect(() => {
 fetchAttendance();
}, []);

 const fetchAttendance = async () => {
 setLoading(true);
 try {
 const data = await lmsApi.getAttendance();
 setAttendance(data);
} catch (error) {
 console.error("Failed to fetch attendance:", error);
 toast.error("Не удалось загрузить посещаемость");
} finally {
 setLoading(false);
}
};

 const filteredAttendance = attendance.filter((record) => 
 filter ==="all"? true : record.status === filter
 );

 const stats = {
 present: attendance.filter(a => a.status === 'present').length,
 absent: attendance.filter(a => a.status === 'absent').length,
 late: attendance.filter(a => a.status === 'late').length,
 excused: attendance.filter(a => a.status === 'excused').length,
 total: attendance.length
};

 const getStatusConfig = (status: string) => {
 switch (status) {
 case 'present': return { label: 'Присутствовал', icon: CheckCircle2, color: 'text-macos-green bg-[rgba(52,199,89,0.06)]'};
 case 'absent': return { label: 'Отсутствовал', icon: XCircle, color: 'text-macos-red bg-[rgba(255,59,48,0.06)]'};
 case 'late': return { label: 'Опоздал', icon: Clock, color: 'text-macos-orange bg-[rgba(255,204,0,0.06)]'};
 case 'excused': return { label: 'Уважительная', icon: AlertCircle, color: 'text-macos-blue bg-tint-blue'};
 default: return { label: status, icon: CheckCircle2, color: 'text-secondary bg-fill-quaternary'};
}
};

 if (loading) {
 return (
 <div className="flex items-center justify-center min-h-[400px]">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
 </div>
 );
}

 return (
 <div className="space-y-6">
 {/* Header */}
 <div>
 <h1 className="text-[24px] font-bold tracking-[-0.025em] leading-tight text-primary">Посещаемость</h1>
 <p className="text-secondary mt-1">История посещений занятий</p>
 </div>

 {/* Stats Cards */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <div className="bg-[rgba(52,199,89,0.06)] p-4 rounded-xl border border-green-100">
 <p className="text-macos-green text-[11px] font-medium uppercase tracking-widest">Присутствовал</p>
 <p className="text-[24px] font-bold tracking-[-0.025em] leading-tight text-macos-green">{stats.present}</p>
 </div>
 <div className="bg-[rgba(255,59,48,0.06)] p-4 rounded-xl border border-red-100">
 <p className="text-macos-red text-[11px] font-medium uppercase tracking-widest">Пропуски</p>
 <p className="text-[24px] font-bold tracking-[-0.025em] leading-tight text-macos-red">{stats.absent}</p>
 </div>
 <div className="bg-[rgba(255,204,0,0.06)] p-4 rounded-xl border border-yellow-100">
 <p className="text-macos-orange text-[11px] font-medium uppercase tracking-widest">Опоздания</p>
 <p className="text-[24px] font-bold tracking-[-0.025em] leading-tight text-macos-orange">{stats.late}</p>
 </div>
 <div className="bg-tint-blue p-4 rounded-xl border border-blue-100">
 <p className="text-macos-blue text-[11px] font-medium uppercase tracking-widest">По уважительной</p>
 <p className="text-[24px] font-bold tracking-[-0.025em] leading-tight text-macos-blue">{stats.excused}</p>
 </div>
 </div>

 {/* Filters */}
 <div className="flex justify-end">
 <div className="inline-flex items-center bg-white mezon-field rounded-lg p-1">
 <Filter className="h-4 w-4 text-tertiary ml-2 mr-1"/>
 <select 
 value={filter} 
 onChange={(e) => setFilter(e.target.value)}
 className="border-none bg-transparent text-sm focus:ring-0 text-secondary py-1 pr-8"
 >
 <option value="all">Все записи</option>
 <option value="present">Присутствовал</option>
 <option value="absent">Отсутствовал</option>
 <option value="late">Опоздал</option>
 <option value="excused">Уважительная причина</option>
 </select>
 </div>
 </div>

 {/* List */}
 <div className="bg-white rounded-xl shadow-subtle border border-card overflow-hidden">
 {filteredAttendance.length > 0 ? (
 <div className="divide-y divide-gray-100">
 {filteredAttendance.map((record) => {
 const config = getStatusConfig(record.status);
 const Icon = config.icon;
 
 return (
 <div key={record.id} className="p-4 flex items-center justify-between hover:bg-fill-quaternary macos-transition">
 <div className="flex items-center gap-4">
 <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.color}`}>
 <Icon className="h-5 w-5"/>
 </div>
 <div>
 <p className="font-medium text-primary">
 {new Date(record.date).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long'})}
 </p>
 <p className="text-sm text-secondary capitalize">{config.label}</p>
 </div>
 </div>
 {record.note && (
 <div className="text-sm text-secondary bg-fill-quaternary px-3 py-1 rounded-lg max-w-xs truncate">
 {record.note}
 </div>
 )}
 </div>
 );
})}
 </div>
 ) : (
 <div className="p-12 text-center text-secondary">
 <Calendar className="h-12 w-12 mx-auto mb-3 text-tertiary"/>
 Записей не найдено
 </div>
 )}
 </div>
 </div>
 );
}