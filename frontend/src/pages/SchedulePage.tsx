// src/pages/SchedulePage.tsx
import { useState, useEffect, useMemo} from"react";
import { toast} from"sonner";
import {
 Calendar,
 PlusCircle,
 Trash2,
 Edit,
 AlertTriangle,
 Users,
 BookOpen,
 Clock,
 DoorOpen,
 ChevronLeft,
 ChevronRight,
 Download,
 Settings,
 Eye,
 UserCheck,
 AlertCircle,
 Check,
 X,
} from"lucide-react";
import { api} from"../lib/api";
import { Card} from"../components/Card";
import { Button} from"../components/ui/button";
import { Input} from"../components/ui/input";
import { Modal} from"../components/Modal";

// ========== TYPES ==========

interface Subject {
 id: number;
 name: string;
 shortName?: string;
 color?: string;
}

interface Room {
 id: number;
 name: string;
 capacity?: number;
}

interface TimeSlot {
 id: number;
 number: number;
 startTime: string;
 endTime: string;
}

interface Group {
 id: number;
 name: string;
}

interface Employee {
 id: number;
 firstName: string;
 lastName: string;
 position: string;
}

interface ScheduleSlot {
 id: number;
 dayOfWeek: number;
 timeSlotId: number;
 timeSlot: TimeSlot;
 groupId: number;
 subjectId: number;
 subject: Subject;
 teacherId: number;
 teacherName?: string;
 groupName?: string;
 roomId?: number;
 room?: Room;
 notes?: string;
}

interface Conflict {
 type:"teacher"|"room"|"group";
 message: string;
 slotId: number;
}

interface AllConflict {
 type: string;
 dayOfWeek: number;
 timeSlot: number;
 slots: number[];
 message: string;
}

// ========== CONSTANTS ==========

const DAY_NAMES: Record<number, string> = {
 1:"Понедельник",
 2:"Вторник",
 3:"Среда",
 4:"Четверг",
 5:"Пятница",
 6:"Суббота",
};

const DAY_NAMES_SHORT: Record<number, string> = {
 1:"Пн",
 2:"Вт",
 3:"Ср",
 4:"Чт",
 5:"Пт",
 6:"Сб",
};

const SUBJECT_COLORS = [
"#4CAF50", // зелёный
"#2196F3", // синий
"#FF9800", // оранжевый
"#9C27B0", // фиолетовый
"#E91E63", // розовый
"#00BCD4", // бирюзовый
"#795548", // коричневый
"#607D8B", // серо-синий
"#F44336", // красный
"#3F51B5", // индиго
];

// ========== MAIN COMPONENT ==========

export default function SchedulePage() {
 // Data states
 const [subjects, setSubjects] = useState<Subject[]>([]);
 const [rooms, setRooms] = useState<Room[]>([]);
 const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
 const [groups, setGroups] = useState<Group[]>([]);
 const [employees, setEmployees] = useState<Employee[]>([]);
 const [scheduleGrid, setScheduleGrid] = useState<Record<number, Record<number, ScheduleSlot>>>({});
 const [allConflicts, setAllConflicts] = useState<AllConflict[]>([]);

 // UI states
 const [loading, setLoading] = useState(true);
 const [activeTab, setActiveTab] = useState<"schedule"|"subjects"|"rooms"|"timeslots"|"conflicts">("schedule");
 const [viewMode, setViewMode] = useState<"group"|"teacher">("group");
 const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
 const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);

 // Modal states
 const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
 const [editingSlot, setEditingSlot] = useState<ScheduleSlot | null>(null);
 const [slotForm, setSlotForm] = useState({
 dayOfWeek: 1,
 timeSlotId: 0,
 subjectId: 0,
 teacherId: 0,
 roomId: 0,
 notes:"",
});
 const [formConflicts, setFormConflicts] = useState<Conflict[]>([]);
 const [isSaving, setIsSaving] = useState(false);
 const [deleteConfirm, setDeleteConfirm] = useState<ScheduleSlot | null>(null);
 const [isDeleting, setIsDeleting] = useState(false);

 // Settings modals
 const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
 const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
 const [subjectForm, setSubjectForm] = useState({ name:"", shortName:"", color: SUBJECT_COLORS[0]});

 const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
 const [editingRoom, setEditingRoom] = useState<Room | null>(null);
 const [roomForm, setRoomForm] = useState({ name:"", capacity:""});

 const [isTimeSlotModalOpen, setIsTimeSlotModalOpen] = useState(false);
 const [editingTimeSlot, setEditingTimeSlot] = useState<TimeSlot | null>(null);
 const [timeSlotForm, setTimeSlotForm] = useState({ number:"", startTime:"", endTime:""});

 // ========== DATA LOADING ==========

 const loadAllData = async () => {
 setLoading(true);
 try {
 const [subjectsData, roomsData, timeSlotsData, groupsData, employeesData] = await Promise.all([
 api.get("/api/schedule/subjects"),
 api.get("/api/schedule/rooms"),
 api.get("/api/schedule/timeslots"),
 api.get("/api/groups"),
 api.get("/api/employees"),
 ]);

 setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
 setRooms(Array.isArray(roomsData) ? roomsData : []);
 setTimeSlots(Array.isArray(timeSlotsData) ? timeSlotsData : []);
 setGroups(Array.isArray(groupsData) ? groupsData : []);
 
 // employees может вернуть {items: [], total: number} или массив
 const employeesList = Array.isArray(employeesData) 
 ? employeesData 
 : (employeesData?.items || []);
 setEmployees(employeesList);

 // Auto-select first group
 const groupsList = Array.isArray(groupsData) ? groupsData : [];
 if (groupsList.length > 0 && !selectedGroupId) {
 setSelectedGroupId(groupsList[0].id);
}
} catch (error: any) {
 toast.error("Ошибка загрузки данных", { description: error?.message});
} finally {
 setLoading(false);
}
};

 const loadScheduleGrid = async () => {
 if (viewMode ==="group"&& selectedGroupId) {
 try {
 const grid = await api.get(`/api/schedule/grid/${selectedGroupId}`);
 setScheduleGrid(grid || {});
} catch (error: any) {
 toast.error("Ошибка загрузки расписания");
}
} else if (viewMode ==="teacher"&& selectedTeacherId) {
 try {
 const grid = await api.get(`/api/schedule/teacher-grid/${selectedTeacherId}`);
 setScheduleGrid(grid || {});
} catch (error: any) {
 toast.error("Ошибка загрузки расписания");
}
}
};

 const loadConflicts = async () => {
 try {
 const conflicts = await api.get("/api/schedule/all-conflicts");
 setAllConflicts(conflicts || []);
} catch (error: any) {
 console.error("Error loading conflicts:", error);
}
};

 useEffect(() => {
 loadAllData();
}, []);

 useEffect(() => {
 loadScheduleGrid();
}, [selectedGroupId, selectedTeacherId, viewMode]);

 useEffect(() => {
 if (activeTab ==="conflicts") {
 loadConflicts();
}
}, [activeTab]);

 // ========== TEACHERS FILTER ==========

 const teachers = useMemo(() => {
 if (!Array.isArray(employees)) return [];
 return employees.filter((e) =>
 e.position?.toLowerCase().includes("учитель") ||
 e.position?.toLowerCase().includes("педагог") ||
 e.position?.toLowerCase().includes("преподаватель")
 );
}, [employees]);

 // ========== SLOT HANDLERS ==========

 const handleCreateSlot = (dayOfWeek: number, timeSlotId: number) => {
 if (!selectedGroupId && viewMode ==="group") {
 toast.error("Сначала выберите класс");
 return;
}
 setEditingSlot(null);
 setSlotForm({
 dayOfWeek,
 timeSlotId,
 subjectId: subjects[0]?.id || 0,
 teacherId: teachers[0]?.id || 0,
 roomId: 0,
 notes:"",
});
 setFormConflicts([]);
 setIsSlotModalOpen(true);
};

 const handleEditSlot = (slot: ScheduleSlot) => {
 setEditingSlot(slot);
 setSlotForm({
 dayOfWeek: slot.dayOfWeek,
 timeSlotId: slot.timeSlotId,
 subjectId: slot.subjectId,
 teacherId: slot.teacherId,
 roomId: slot.roomId || 0,
 notes: slot.notes ||"",
});
 setFormConflicts([]);
 setIsSlotModalOpen(true);
};

 const checkSlotConflicts = async () => {
 if (!selectedGroupId && viewMode ==="group") return;

 try {
 const result = await api.post("/api/schedule/check-conflicts", {
 dayOfWeek: slotForm.dayOfWeek,
 timeSlotId: slotForm.timeSlotId,
 groupId: selectedGroupId,
 teacherId: slotForm.teacherId,
 roomId: slotForm.roomId || undefined,
 excludeSlotId: editingSlot?.id,
});
 setFormConflicts(result.conflicts || []);
} catch (error) {
 console.error("Error checking conflicts:", error);
}
};

 useEffect(() => {
 if (isSlotModalOpen && slotForm.teacherId && slotForm.timeSlotId) {
 checkSlotConflicts();
}
}, [slotForm.dayOfWeek, slotForm.timeSlotId, slotForm.teacherId, slotForm.roomId]);

 const handleSaveSlot = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!selectedGroupId && viewMode ==="group") {
 toast.error("Класс не выбран");
 return;
}

 setIsSaving(true);
 try {
 const payload = {
 ...slotForm,
 groupId: selectedGroupId,
 roomId: slotForm.roomId || null,
};

 if (editingSlot) {
 await api.put(`/api/schedule/slots/${editingSlot.id}`, payload);
 toast.success("Урок обновлён");
} else {
 await api.post("/api/schedule/slots", payload);
 toast.success("Урок добавлен");
}

 setIsSlotModalOpen(false);
 loadScheduleGrid();
 loadConflicts();
} catch (error: any) {
 if (error?.conflicts) {
 setFormConflicts(error.conflicts);
 toast.error("Обнаружены конфликты");
} else {
 toast.error("Ошибка сохранения", { description: error?.message});
}
} finally {
 setIsSaving(false);
}
};

 const handleDeleteSlot = async () => {
 if (!deleteConfirm) return;
 setIsDeleting(true);
 try {
 await api.delete(`/api/schedule/slots/${deleteConfirm.id}`);
 toast.success("Урок удалён");
 setDeleteConfirm(null);
 loadScheduleGrid();
 loadConflicts();
} catch (error: any) {
 toast.error("Ошибка удаления", { description: error?.message});
} finally {
 setIsDeleting(false);
}
};

 // ========== SUBJECT HANDLERS ==========

 const handleCreateSubject = () => {
 setEditingSubject(null);
 setSubjectForm({ name:"", shortName:"", color: SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length]});
 setIsSubjectModalOpen(true);
};

 const handleEditSubject = (subject: Subject) => {
 setEditingSubject(subject);
 setSubjectForm({
 name: subject.name,
 shortName: subject.shortName ||"",
 color: subject.color || SUBJECT_COLORS[0],
});
 setIsSubjectModalOpen(true);
};

 const handleSaveSubject = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!subjectForm.name.trim()) {
 toast.error("Введите название предмета");
 return;
}

 setIsSaving(true);
 try {
 if (editingSubject) {
 await api.put(`/api/schedule/subjects/${editingSubject.id}`, subjectForm);
 toast.success("Предмет обновлён");
} else {
 await api.post("/api/schedule/subjects", subjectForm);
 toast.success("Предмет добавлен");
}
 setIsSubjectModalOpen(false);
 loadAllData();
} catch (error: any) {
 toast.error("Ошибка сохранения", { description: error?.message});
} finally {
 setIsSaving(false);
}
};

 const handleDeleteSubject = async (subject: Subject) => {
 if (!confirm(`Удалить предмет"${subject.name}"?`)) return;
 try {
 await api.delete(`/api/schedule/subjects/${subject.id}`);
 toast.success("Предмет удалён");
 loadAllData();
} catch (error: any) {
 toast.error("Ошибка удаления", { description: error?.message});
}
};

 // ========== ROOM HANDLERS ==========

 const handleCreateRoom = () => {
 setEditingRoom(null);
 setRoomForm({ name:"", capacity:""});
 setIsRoomModalOpen(true);
};

 const handleEditRoom = (room: Room) => {
 setEditingRoom(room);
 setRoomForm({ name: room.name, capacity: room.capacity?.toString() ||""});
 setIsRoomModalOpen(true);
};

 const handleSaveRoom = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!roomForm.name.trim()) {
 toast.error("Введите название кабинета");
 return;
}

 setIsSaving(true);
 try {
 const payload = {
 name: roomForm.name,
 capacity: roomForm.capacity ? parseInt(roomForm.capacity) : null,
};

 if (editingRoom) {
 await api.put(`/api/schedule/rooms/${editingRoom.id}`, payload);
 toast.success("Кабинет обновлён");
} else {
 await api.post("/api/schedule/rooms", payload);
 toast.success("Кабинет добавлен");
}
 setIsRoomModalOpen(false);
 loadAllData();
} catch (error: any) {
 toast.error("Ошибка сохранения", { description: error?.message});
} finally {
 setIsSaving(false);
}
};

 const handleDeleteRoom = async (room: Room) => {
 if (!confirm(`Удалить кабинет"${room.name}"?`)) return;
 try {
 await api.delete(`/api/schedule/rooms/${room.id}`);
 toast.success("Кабинет удалён");
 loadAllData();
} catch (error: any) {
 toast.error("Ошибка удаления", { description: error?.message});
}
};

 // ========== TIMESLOT HANDLERS ==========

 const handleCreateTimeSlot = () => {
 setEditingTimeSlot(null);
 const nextNumber = timeSlots.length > 0 ? Math.max(...timeSlots.map((s) => s.number)) + 1 : 1;
 setTimeSlotForm({ number: nextNumber.toString(), startTime:"", endTime:""});
 setIsTimeSlotModalOpen(true);
};

 const handleEditTimeSlot = (slot: TimeSlot) => {
 setEditingTimeSlot(slot);
 setTimeSlotForm({
 number: slot.number.toString(),
 startTime: slot.startTime,
 endTime: slot.endTime,
});
 setIsTimeSlotModalOpen(true);
};

 const handleSaveTimeSlot = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!timeSlotForm.number || !timeSlotForm.startTime || !timeSlotForm.endTime) {
 toast.error("Заполните все поля");
 return;
}

 setIsSaving(true);
 try {
 const payload = {
 number: parseInt(timeSlotForm.number),
 startTime: timeSlotForm.startTime,
 endTime: timeSlotForm.endTime,
};

 if (editingTimeSlot) {
 await api.put(`/api/schedule/timeslots/${editingTimeSlot.id}`, payload);
 toast.success("Урок обновлён");
} else {
 await api.post("/api/schedule/timeslots", payload);
 toast.success("Урок добавлен");
}
 setIsTimeSlotModalOpen(false);
 loadAllData();
} catch (error: any) {
 toast.error("Ошибка сохранения", { description: error?.message});
} finally {
 setIsSaving(false);
}
};

 const handleDeleteTimeSlot = async (slot: TimeSlot) => {
 if (!confirm(`Удалить ${slot.number}-й урок?`)) return;
 try {
 await api.delete(`/api/schedule/timeslots/${slot.id}`);
 toast.success("Урок удалён");
 loadAllData();
} catch (error: any) {
 toast.error("Ошибка удаления", { description: error?.message});
}
};

 // ========== EXPORT ==========

 const exportSchedule = () => {
 if (!selectedGroupId || viewMode !=="group") {
 toast.error("Выберите класс для экспорта");
 return;
}

 const group = groups.find((g) => g.id === selectedGroupId);
 const sortedSlots = timeSlots.sort((a, b) => a.number - b.number);

 let csv = `Расписание для ${group?.name}\n\n`;
 csv += `Урок,${Object.values(DAY_NAMES).join(",")}\n`;

 for (const ts of sortedSlots) {
 const row = [`${ts.number}. ${ts.startTime}-${ts.endTime}`];
 for (let day = 1; day <= 6; day++) {
 const slot = scheduleGrid[day]?.[ts.number];
 if (slot) {
 row.push(`${slot.subject.name} (${slot.teacherName ||"—"})`);
} else {
 row.push("—");
}
}
 csv += row.join(",") +"\n";
}

 const blob = new Blob(["\ufeff"+ csv], { type:"text/csv;charset=utf-8"});
 const url = URL.createObjectURL(blob);
 const a = document.createElement("a");
 a.href = url;
 a.download = `schedule_${group?.name ||"export"}.csv`;
 a.click();
 URL.revokeObjectURL(url);
};

 // ========== RENDER ==========

 if (loading) {
 return (
 <div className="flex items-center justify-center h-64">
 <div className="text-tertiary">Загрузка расписания...</div>
 </div>
 );
}

 const currentSelector = viewMode ==="group"? selectedGroupId : selectedTeacherId;
 const currentList = viewMode ==="group"? groups : teachers;

 const navigatePrev = () => {
 const idx = currentList.findIndex((item) => item.id === currentSelector);
 if (idx > 0) {
 if (viewMode ==="group") {
 setSelectedGroupId(currentList[idx - 1].id);
} else {
 setSelectedTeacherId(currentList[idx - 1].id);
}
}
};

 const navigateNext = () => {
 const idx = currentList.findIndex((item) => item.id === currentSelector);
 if (idx < currentList.length - 1) {
 if (viewMode ==="group") {
 setSelectedGroupId(currentList[idx + 1].id);
} else {
 setSelectedTeacherId(currentList[idx + 1].id);
}
}
};

 return (
 <div>
 {/* Header */}
 <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
 <div className="flex items-center gap-2">
 <Calendar className="h-6 w-6"/>
 <h1 className="text-[24px] font-bold tracking-[-0.025em] leading-tight">Расписание</h1>
 {allConflicts.length > 0 && (
 <span className="ml-2 px-2 py-1 bg-[rgba(255,59,48,0.1)] text-macos-red text-xs rounded-full flex items-center gap-1">
 <AlertCircle className="h-3 w-3"/>
 {allConflicts.length} конфликтов
 </span>
 )}
 </div>
 </div>

 {/* Tabs */}
 <div className="flex flex-wrap gap-2 mb-6 border-b pb-4">
 <Button
 variant={activeTab ==="schedule"?"default":"outline"}
 size="sm"
 onClick={() => setActiveTab("schedule")}
 >
 <Calendar className="h-4 w-4 mr-2"/>
 Расписание
 </Button>
 <Button
 variant={activeTab ==="subjects"?"default":"outline"}
 size="sm"
 onClick={() => setActiveTab("subjects")}
 >
 <BookOpen className="h-4 w-4 mr-2"/>
 Предметы
 </Button>
 <Button
 variant={activeTab ==="rooms"?"default":"outline"}
 size="sm"
 onClick={() => setActiveTab("rooms")}
 >
 <DoorOpen className="h-4 w-4 mr-2"/>
 Кабинеты
 </Button>
 <Button
 variant={activeTab ==="timeslots"?"default":"outline"}
 size="sm"
 onClick={() => setActiveTab("timeslots")}
 >
 <Clock className="h-4 w-4 mr-2"/>
 Звонки
 </Button>
 <Button
 variant={activeTab ==="conflicts"?"default":"outline"}
 size="sm"
 onClick={() => setActiveTab("conflicts")}
 className={allConflicts.length > 0 ?"border-[rgba(255,59,48,0.3)] text-macos-red":""}
 >
 <AlertTriangle className="h-4 w-4 mr-2"/>
 Конфликты
 {allConflicts.length > 0 && (
 <span className="ml-1 px-1.5 py-0.5 bg-[rgba(255,59,48,0.1)] text-macos-red text-xs rounded">
 {allConflicts.length}
 </span>
 )}
 </Button>
 </div>

 {/* Schedule Tab */}
 {activeTab ==="schedule"&& (
 <>
 {/* Controls */}
 <Card className="p-4 mb-4">
 <div className="flex flex-wrap items-center gap-4">
 {/* View mode toggle */}
 <div className="flex items-center gap-2">
 <Button
 size="sm"
 variant={viewMode ==="group"?"default":"outline"}
 onClick={() => {
 setViewMode("group");
 if (groups.length > 0 && !selectedGroupId) {
 setSelectedGroupId(groups[0].id);
}
}}
 >
 <Users className="h-4 w-4 mr-1"/>
 По классам
 </Button>
 <Button
 size="sm"
 variant={viewMode ==="teacher"?"default":"outline"}
 onClick={() => {
 setViewMode("teacher");
 if (teachers.length > 0 && !selectedTeacherId) {
 setSelectedTeacherId(teachers[0].id);
}
}}
 >
 <UserCheck className="h-4 w-4 mr-1"/>
 По учителям
 </Button>
 </div>

 {/* Selector */}
 <div className="flex items-center gap-2 flex-1">
 <Button variant="outline"size="sm"onClick={navigatePrev} disabled={!currentSelector}>
 <ChevronLeft className="h-4 w-4"/>
 </Button>

 <select
 className="flex-1 max-w-xs mezon-field"
 value={currentSelector ||""}
 onChange={(e) => {
 const id = Number(e.target.value);
 if (viewMode ==="group") {
 setSelectedGroupId(id);
} else {
 setSelectedTeacherId(id);
}
}}
 >
 <option value="">
 {viewMode ==="group"?"Выберите класс":"Выберите учителя"}
 </option>
 {currentList.map((item) => (
 <option key={item.id} value={item.id}>
 {viewMode ==="group"
 ? (item as Group).name
 : `${(item as Employee).lastName} ${(item as Employee).firstName}`}
 </option>
 ))}
 </select>

 <Button variant="outline"size="sm"onClick={navigateNext} disabled={!currentSelector}>
 <ChevronRight className="h-4 w-4"/>
 </Button>
 </div>

 {/* Export */}
 {viewMode ==="group"&& (
 <Button variant="outline"size="sm"onClick={exportSchedule}>
 <Download className="h-4 w-4 mr-1"/>
 Экспорт
 </Button>
 )}
 </div>
 </Card>

 {/* Schedule Grid */}
 {timeSlots.length === 0 ? (
 <Card className="p-8 text-center text-tertiary">
 <Clock className="h-12 w-12 mx-auto mb-4 text-tertiary"/>
 <p className="mb-4">Сначала настройте расписание звонков</p>
 <Button onClick={() => setActiveTab("timeslots")}>
 <Settings className="h-4 w-4 mr-2"/>
 Настроить звонки
 </Button>
 </Card>
 ) : !currentSelector ? (
 <Card className="p-8 text-center text-tertiary">
 {viewMode ==="group"?"Выберите класс для просмотра расписания":"Выберите учителя для просмотра расписания"}
 </Card>
 ) : (
 <Card className="overflow-x-auto">
 <table className="w-full min-w-[800px]">
 <thead>
 <tr className="bg-fill-quaternary">
 <th className="p-3 text-left text-[11px] font-medium uppercase tracking-widest text-secondary border-b border-[var(--separator)] w-24">
 Урок
 </th>
 {[1, 2, 3, 4, 5, 6].map((day) => (
 <th
 key={day}
 className="p-3 text-center text-[11px] font-medium uppercase tracking-widest text-secondary border-b border-[var(--separator)]"
 >
 {DAY_NAMES[day]}
 </th>
 ))}
 </tr>
 </thead>
 <tbody>
 {timeSlots
 .sort((a, b) => a.number - b.number)
 .map((ts) => (
 <tr key={ts.id} className="border-b border-[var(--separator)] hover:bg-[rgba(0,122,255,0.03)]">
 <td className="p-2 text-sm">
 <div className="font-medium">{ts.number} урок</div>
 <div className="text-xs text-tertiary">
 {ts.startTime} – {ts.endTime}
 </div>
 </td>
 {[1, 2, 3, 4, 5, 6].map((day) => {
 const slotData = scheduleGrid[day]?.[ts.number];
 
 // Для режима учителя может быть массив (несколько классов)
 const slots = Array.isArray(slotData) ? slotData : slotData ? [slotData] : [];

 return (
 <td key={day} className="p-1 text-center align-top">
 {slots.length > 0 ? (
 <div className="space-y-1">
 {slots.map((slot: ScheduleSlot, idx: number) => (
 <div
 key={slot.id || idx}
 className="p-2 rounded-lg text-white text-xs cursor-pointer transition-transform hover:scale-105 relative group"
 style={{ backgroundColor: slot.subject.color ||"#6B7280"}}
 onClick={() => viewMode ==="group"&& handleEditSlot(slot)}
 >
 <div className="font-medium truncate">
 {slot.subject.shortName || slot.subject.name}
 </div>
 <div className="text-[10px] opacity-90 truncate">
 {viewMode ==="group"? slot.teacherName : slot.groupName}
 </div>
 {slot.room && (
 <div className="text-[10px] opacity-75 truncate">
 {slot.room.name}
 </div>
 )}
 {viewMode ==="group"&& (
 <button
 className="absolute -top-1 -right-1 w-5 h-5 bg-macos-red rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
 onClick={(e) => {
 e.stopPropagation();
 setDeleteConfirm(slot);
}}
 >
 <X className="h-3 w-3"/>
 </button>
 )}
 </div>
 ))}
 </div>
 ) : viewMode ==="group"? (
 <button
 className="w-full h-16 border-2 border-dashed border-[var(--separator)] rounded-[var(--radius-md)] text-tertiary hover:border-[rgba(0,122,255,0.3)] hover:text-macos-blue hover:bg-[rgba(0,122,255,0.04)] macos-transition flex items-center justify-center"
 onClick={() => handleCreateSlot(day, ts.id)}
 >
 <PlusCircle className="h-5 w-5"/>
 </button>
 ) : (
 <div className="w-full h-16 border border-[var(--separator)] rounded-[var(--radius-md)] bg-fill-quaternary"/>
 )}
 </td>
 );
})}
 </tr>
 ))}
 </tbody>
 </table>
 </Card>
 )}
 </>
 )}

 {/* Subjects Tab */}
 {activeTab ==="subjects"&& (
 <Card className="p-4">
 <div className="flex justify-between items-center mb-4">
 <h2 className="text-[14px] font-semibold tracking-[-0.01em] flex items-center gap-2">
 <BookOpen className="h-5 w-5"/>
 Предметы ({subjects.length})
 </h2>
 <Button size="sm"onClick={handleCreateSubject}>
 <PlusCircle className="h-4 w-4 mr-2"/>
 Добавить
 </Button>
 </div>

 {subjects.length === 0 ? (
 <p className="text-tertiary text-center py-8">Предметы не добавлены</p>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
 {subjects.map((subject) => (
 <div
 key={subject.id}
 className="flex items-center justify-between p-3 rounded-[var(--radius-md)] border border-[var(--separator)]"
 >
 <div className="flex items-center gap-3">
 <div
 className="w-4 h-4 rounded"
 style={{ backgroundColor: subject.color ||"#6B7280"}}
 />
 <div>
 <p className="font-medium">{subject.name}</p>
 {subject.shortName && (
 <p className="text-xs text-tertiary">{subject.shortName}</p>
 )}
 </div>
 </div>
 <div className="flex gap-1">
 <Button variant="ghost"size="sm"onClick={() => handleEditSubject(subject)}>
 <Edit className="h-4 w-4"/>
 </Button>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => handleDeleteSubject(subject)}
 className="text-macos-red hover:text-macos-red hover:bg-[rgba(255,59,48,0.06)]"
 >
 <Trash2 className="h-4 w-4"/>
 </Button>
 </div>
 </div>
 ))}
 </div>
 )}
 </Card>
 )}

 {/* Rooms Tab */}
 {activeTab ==="rooms"&& (
 <Card className="p-4">
 <div className="flex justify-between items-center mb-4">
 <h2 className="text-[14px] font-semibold tracking-[-0.01em] flex items-center gap-2">
 <DoorOpen className="h-5 w-5"/>
 Кабинеты ({rooms.length})
 </h2>
 <Button size="sm"onClick={handleCreateRoom}>
 <PlusCircle className="h-4 w-4 mr-2"/>
 Добавить
 </Button>
 </div>

 {rooms.length === 0 ? (
 <p className="text-tertiary text-center py-8">Кабинеты не добавлены</p>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
 {rooms.map((room) => (
 <div
 key={room.id}
 className="flex items-center justify-between p-3 rounded-[var(--radius-md)] border border-[var(--separator)]"
 >
 <div>
 <p className="font-medium">{room.name}</p>
 {room.capacity && (
 <p className="text-xs text-tertiary">Вместимость: {room.capacity}</p>
 )}
 </div>
 <div className="flex gap-1">
 <Button variant="ghost"size="sm"onClick={() => handleEditRoom(room)}>
 <Edit className="h-4 w-4"/>
 </Button>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => handleDeleteRoom(room)}
 className="text-macos-red hover:text-macos-red hover:bg-[rgba(255,59,48,0.06)]"
 >
 <Trash2 className="h-4 w-4"/>
 </Button>
 </div>
 </div>
 ))}
 </div>
 )}
 </Card>
 )}

 {/* Time Slots Tab */}
 {activeTab ==="timeslots"&& (
 <Card className="p-4">
 <div className="flex justify-between items-center mb-4">
 <h2 className="text-[14px] font-semibold tracking-[-0.01em] flex items-center gap-2">
 <Clock className="h-5 w-5"/>
 Расписание звонков ({timeSlots.length})
 </h2>
 <Button size="sm"onClick={handleCreateTimeSlot}>
 <PlusCircle className="h-4 w-4 mr-2"/>
 Добавить
 </Button>
 </div>

 {timeSlots.length === 0 ? (
 <p className="text-tertiary text-center py-8">Звонки не настроены</p>
 ) : (
 <div className="space-y-2">
 {timeSlots
 .sort((a, b) => a.number - b.number)
 .map((slot) => (
 <div
 key={slot.id}
 className="flex items-center justify-between p-3 rounded-[var(--radius-md)] border border-[var(--separator)]"
 >
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 rounded-full bg-tint-blue flex items-center justify-center font-bold text-macos-blue">
 {slot.number}
 </div>
 <div>
 <p className="font-medium">{slot.number}-й урок</p>
 <p className="text-sm text-tertiary">
 {slot.startTime} – {slot.endTime}
 </p>
 </div>
 </div>
 <div className="flex gap-1">
 <Button variant="ghost"size="sm"onClick={() => handleEditTimeSlot(slot)}>
 <Edit className="h-4 w-4"/>
 </Button>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => handleDeleteTimeSlot(slot)}
 className="text-macos-red hover:text-macos-red hover:bg-[rgba(255,59,48,0.06)]"
 >
 <Trash2 className="h-4 w-4"/>
 </Button>
 </div>
 </div>
 ))}
 </div>
 )}
 </Card>
 )}

 {/* Conflicts Tab */}
 {activeTab ==="conflicts"&& (
 <Card className="p-4">
 <div className="flex justify-between items-center mb-4">
 <h2 className="text-[14px] font-semibold tracking-[-0.01em] flex items-center gap-2">
 <AlertTriangle className="h-5 w-5 text-macos-orange"/>
 Конфликты в расписании
 </h2>
 <Button variant="outline"size="sm"onClick={loadConflicts}>
 Обновить
 </Button>
 </div>

 {allConflicts.length === 0 ? (
 <div className="text-center py-8">
 <Check className="h-12 w-12 mx-auto text-macos-green mb-4"/>
 <p className="text-macos-green font-medium">Конфликтов не обнаружено!</p>
 <p className="text-tertiary text-sm mt-2">Расписание составлено корректно</p>
 </div>
 ) : (
 <div className="space-y-3">
 {allConflicts.map((conflict, idx) => (
 <div
 key={idx}
 className={`p-4 rounded-[var(--radius-md)] border-l-4 ${
 conflict.type ==="teacher"
 ?"border-macos-red bg-[rgba(255,59,48,0.05)]"
 : conflict.type ==="room"
 ?"border-macos-orange bg-[rgba(255,149,0,0.05)]"
 :"border-[var(--color-yellow)] bg-[rgba(255,204,0,0.05)]"
}`}
 >
 <div className="flex items-start gap-3">
 <div className="flex-shrink-0">
 {conflict.type ==="teacher"? (
 <UserCheck className="h-5 w-5 text-macos-red"/>
 ) : conflict.type ==="room"? (
 <DoorOpen className="h-5 w-5 text-macos-orange"/>
 ) : (
 <Users className="h-5 w-5 text-[var(--color-yellow)]"/>
 )}
 </div>
 <div className="flex-1">
 <p className="font-medium text-primary">{conflict.message}</p>
 <p className="text-sm text-secondary mt-1">
 {DAY_NAMES[conflict.dayOfWeek]}, {conflict.timeSlot}-й урок
 </p>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </Card>
 )}

 {/* ========== MODALS ========== */}

 {/* Slot Modal */}
 <Modal
 isOpen={isSlotModalOpen}
 onClose={() => setIsSlotModalOpen(false)}
 title={editingSlot ?"Редактировать урок":"Добавить урок"}
 >
 <form onSubmit={handleSaveSlot} className="p-4 space-y-4">
 {formConflicts.length > 0 && (
 <div className="p-3 bg-[rgba(255,59,48,0.06)] border border-[rgba(255,59,48,0.15)] rounded-[var(--radius-md)]">
 <p className="text-[11px] font-medium uppercase tracking-widest text-macos-red mb-2">Обнаружены конфликты:</p>
 <ul className="text-sm text-macos-red space-y-1">
 {formConflicts.map((c, i) => (
 <li key={i}>• {c.message}</li>
 ))}
 </ul>
 </div>
 )}

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block mb-1 font-medium text-sm">День недели</label>
 <select
 className="mezon-field w-full"
 value={slotForm.dayOfWeek}
 onChange={(e) => setSlotForm({ ...slotForm, dayOfWeek: Number(e.target.value)})}
 >
 {[1, 2, 3, 4, 5, 6].map((d) => (
 <option key={d} value={d}>{DAY_NAMES[d]}</option>
 ))}
 </select>
 </div>
 <div>
 <label className="block mb-1 font-medium text-sm">Урок</label>
 <select
 className="mezon-field w-full"
 value={slotForm.timeSlotId}
 onChange={(e) => setSlotForm({ ...slotForm, timeSlotId: Number(e.target.value)})}
 >
 {timeSlots.map((ts) => (
 <option key={ts.id} value={ts.id}>
 {ts.number}-й ({ts.startTime}–{ts.endTime})
 </option>
 ))}
 </select>
 </div>
 </div>

 <div>
 <label className="block mb-1 font-medium text-sm">Предмет</label>
 <select
 className="mezon-field w-full"
 value={slotForm.subjectId}
 onChange={(e) => setSlotForm({ ...slotForm, subjectId: Number(e.target.value)})}
 >
 {subjects.map((s) => (
 <option key={s.id} value={s.id}>{s.name}</option>
 ))}
 </select>
 </div>

 <div>
 <label className="block mb-1 font-medium text-sm">Учитель</label>
 <select
 className="mezon-field w-full"
 value={slotForm.teacherId}
 onChange={(e) => setSlotForm({ ...slotForm, teacherId: Number(e.target.value)})}
 >
 {teachers.map((t) => (
 <option key={t.id} value={t.id}>
 {t.lastName} {t.firstName}
 </option>
 ))}
 </select>
 </div>

 <div>
 <label className="block mb-1 font-medium text-sm">Кабинет (опционально)</label>
 <select
 className="mezon-field w-full"
 value={slotForm.roomId}
 onChange={(e) => setSlotForm({ ...slotForm, roomId: Number(e.target.value)})}
 >
 <option value={0}>— Не указан —</option>
 {rooms.map((r) => (
 <option key={r.id} value={r.id}>{r.name}</option>
 ))}
 </select>
 </div>

 <div>
 <label className="block mb-1 font-medium text-sm">Примечание</label>
 <Input
 value={slotForm.notes}
 onChange={(e) => setSlotForm({ ...slotForm, notes: e.target.value})}
 placeholder="Например: Онлайн-урок"
 />
 </div>

 <div className="flex justify-end gap-3 pt-4">
 <Button type="button"variant="outline"onClick={() => setIsSlotModalOpen(false)}>
 Отмена
 </Button>
 <Button type="submit"disabled={isSaving || formConflicts.length > 0}>
 {isSaving ?"Сохранение...":"Сохранить"}
 </Button>
 </div>
 </form>
 </Modal>

 {/* Subject Modal */}
 <Modal
 isOpen={isSubjectModalOpen}
 onClose={() => setIsSubjectModalOpen(false)}
 title={editingSubject ?"Редактировать предмет":"Добавить предмет"}
 >
 <form onSubmit={handleSaveSubject} className="p-4 space-y-4">
 <div>
 <label className="block mb-1 font-medium text-sm">Название</label>
 <Input
 value={subjectForm.name}
 onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value})}
 placeholder="Математика"
 required
 />
 </div>
 <div>
 <label className="block mb-1 font-medium text-sm">Сокращение</label>
 <Input
 value={subjectForm.shortName}
 onChange={(e) => setSubjectForm({ ...subjectForm, shortName: e.target.value})}
 placeholder="Мат"
 />
 </div>
 <div>
 <label className="block mb-1 font-medium text-sm">Цвет</label>
 <div className="flex flex-wrap gap-2">
 {SUBJECT_COLORS.map((color) => (
 <button
 key={color}
 type="button"
 className={`w-8 h-8 rounded-lg border-2 transition-transform ${
 subjectForm.color === color ?"border-text-primary scale-110":"border-transparent"
}`}
 style={{ backgroundColor: color}}
 onClick={() => setSubjectForm({ ...subjectForm, color})}
 />
 ))}
 </div>
 </div>
 <div className="flex justify-end gap-3 pt-4">
 <Button type="button"variant="outline"onClick={() => setIsSubjectModalOpen(false)}>
 Отмена
 </Button>
 <Button type="submit"disabled={isSaving}>
 {isSaving ?"Сохранение...":"Сохранить"}
 </Button>
 </div>
 </form>
 </Modal>

 {/* Room Modal */}
 <Modal
 isOpen={isRoomModalOpen}
 onClose={() => setIsRoomModalOpen(false)}
 title={editingRoom ?"Редактировать кабинет":"Добавить кабинет"}
 >
 <form onSubmit={handleSaveRoom} className="p-4 space-y-4">
 <div>
 <label className="block mb-1 font-medium text-sm">Название</label>
 <Input
 value={roomForm.name}
 onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value})}
 placeholder="Кабинет 101"
 required
 />
 </div>
 <div>
 <label className="block mb-1 font-medium text-sm">Вместимость</label>
 <Input
 type="number"
 value={roomForm.capacity}
 onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value})}
 placeholder="30"
 />
 </div>
 <div className="flex justify-end gap-3 pt-4">
 <Button type="button"variant="outline"onClick={() => setIsRoomModalOpen(false)}>
 Отмена
 </Button>
 <Button type="submit"disabled={isSaving}>
 {isSaving ?"Сохранение...":"Сохранить"}
 </Button>
 </div>
 </form>
 </Modal>

 {/* TimeSlot Modal */}
 <Modal
 isOpen={isTimeSlotModalOpen}
 onClose={() => setIsTimeSlotModalOpen(false)}
 title={editingTimeSlot ?"Редактировать урок":"Добавить урок"}
 >
 <form onSubmit={handleSaveTimeSlot} className="p-4 space-y-4">
 <div>
 <label className="block mb-1 font-medium text-sm">Номер урока</label>
 <Input
 type="number"
 value={timeSlotForm.number}
 onChange={(e) => setTimeSlotForm({ ...timeSlotForm, number: e.target.value})}
 placeholder="1"
 min="1"
 required
 />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block mb-1 font-medium text-sm">Начало</label>
 <Input
 type="time"
 value={timeSlotForm.startTime}
 onChange={(e) => setTimeSlotForm({ ...timeSlotForm, startTime: e.target.value})}
 required
 />
 </div>
 <div>
 <label className="block mb-1 font-medium text-sm">Окончание</label>
 <Input
 type="time"
 value={timeSlotForm.endTime}
 onChange={(e) => setTimeSlotForm({ ...timeSlotForm, endTime: e.target.value})}
 required
 />
 </div>
 </div>
 <div className="flex justify-end gap-3 pt-4">
 <Button type="button"variant="outline"onClick={() => setIsTimeSlotModalOpen(false)}>
 Отмена
 </Button>
 <Button type="submit"disabled={isSaving}>
 {isSaving ?"Сохранение...":"Сохранить"}
 </Button>
 </div>
 </form>
 </Modal>

 {/* Delete Confirmation Modal */}
 <Modal
 isOpen={!!deleteConfirm}
 onClose={() => setDeleteConfirm(null)}
 title="Удаление урока"
 >
 <div className="p-4">
 <div className="flex items-start gap-4">
 <div className="flex-shrink-0 w-10 h-10 bg-[rgba(255,59,48,0.12)] rounded-full flex items-center justify-center">
 <AlertTriangle className="h-5 w-5 text-macos-red"/>
 </div>
 <div className="flex-1">
 <p className="font-medium text-primary">Удалить этот урок из расписания?</p>
 {deleteConfirm && (
 <div className="mt-2 p-3 bg-fill-quaternary rounded-[var(--radius-md)] text-sm">
 <p><strong>{deleteConfirm.subject.name}</strong></p>
 <p className="text-secondary">
 {DAY_NAMES[deleteConfirm.dayOfWeek]}, {deleteConfirm.timeSlot.number}-й урок
 </p>
 </div>
 )}
 </div>
 </div>
 <div className="flex justify-end gap-3 mt-6">
 <Button variant="outline"onClick={() => setDeleteConfirm(null)} disabled={isDeleting}>
 Отмена
 </Button>
 <Button variant="destructive"onClick={handleDeleteSlot} disabled={isDeleting}>
 {isDeleting ?"Удаление...":"Удалить"}
 </Button>
 </div>
 </div>
 </Modal>
 </div>
 );
}
