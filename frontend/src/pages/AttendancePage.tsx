import { useState, useEffect, useCallback} from"react";
import { api} from"../lib/api";
import { Card} from"../components/Card";
import { Button} from"../components/ui/button";

interface Child {
 id: number;
 firstName: string;
 lastName: string;
}

interface Group {
 id: number;
 name: string;
}

type AttendanceState = Map<number, boolean>;

export default function AttendancePage() {
 const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
 const [groups, setGroups] = useState<Group[]>([]);
 const [selectedGroupId, setSelectedGroupId] = useState<string>("");
 const [children, setChildren] = useState<Child[]>([]);
 const [attendance, setAttendance] = useState<AttendanceState>(new Map());
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 api.get("/api/groups")
 .then((data) => {
 setGroups(data || []);
 if (data && data.length > 0) {
 setSelectedGroupId(String(data[0].id));
}
})
 .catch(() => setError("Не удалось загрузить список групп."));
}, []);

 useEffect(() => {
 if (!selectedGroupId) {
 setChildren([]);
 return;
}
 setLoading(true);
 setError(null);
 api.get(`/api/children?groupId=${selectedGroupId}&pageSize=200`)
 .then((data) => {
 setChildren(data.items || []);
 setAttendance(new Map());
})
 .catch(() => setError("Не удалось загрузить список детей."))
 .finally(() => setLoading(false));
}, [selectedGroupId]);

 const handleSetPresence = useCallback(async (childId: number, isPresent: boolean) => {
 setAttendance(prev => new Map(prev).set(childId, isPresent));

 try {
 await api.post("/api/attendance", {
 date,
 childId,
 isPresent,
 clubId: null,
});
} catch (err) {
 setError(`Ошибка сохранения для ребенка с ID ${childId}`);
 setAttendance(prev => {
 const newMap = new Map(prev);
 newMap.delete(childId);
 return newMap;
});
}
}, [date]);

 return (
 <div className="space-y-6">
 <h1 className="text-[24px] font-bold tracking-[-0.025em] leading-tight">Посещаемость</h1>

 <Card className="p-4 shadow-subtle">
 <div className="flex flex-wrap items-center gap-4">
 <div>
 <label htmlFor="date-select"className="block text-[11px] font-medium uppercase tracking-widest mb-1">
 Дата
 </label>
 <input
 id="date-select"
 type="date"
 value={date}
 onChange={(e) => setDate(e.target.value)}
 className="mezon-field"
 />
 </div>
 <div>
 <label htmlFor="group-select"className="block text-[11px] font-medium uppercase tracking-widest mb-1">
 Класс
 </label>
 <select
 id="group-select"
 value={selectedGroupId}
 onChange={(e) => setSelectedGroupId(e.target.value)}
 className="mezon-field"
 disabled={groups.length === 0}
 >
 {groups.map((group) => (
 <option key={group.id} value={group.id}>
 {group.name}
 </option>
 ))}
 </select>
 </div>
 </div>
 </Card>

 {error && (
 <div className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--macos-red)] bg-[rgba(255,59,48,0.06)] border border-[rgba(255,59,48,0.15)] p-3 rounded-[var(--radius-md)]">
 {error}
 </div>
 )}

 <Card className="shadow-subtle">
 {loading ? (
 <div className="p-4 text-center text-[14px] leading-relaxed text-tertiary">Загрузка...</div>
 ) : (
 <ul className="divide-y divide-[var(--separator)]">
 {children.map((child) => (
 <li key={child.id} className="p-4 flex justify-between items-center">
 <span className="text-[14px] font-semibold tracking-[-0.01em] text-primary">{child.lastName} {child.firstName}</span>
 <div className="flex gap-2">
 <Button
 onClick={() => handleSetPresence(child.id, true)}
 className={`!px-3 !py-1 text-sm ${
 attendance.get(child.id) === true
 ? '!bg-macos-green hover:!bg-macos-green !text-white'
 : '!bg-fill-quaternary hover:!bg-fill-tertiary !text-secondary'
}`}
 >
 Присутствует
 </Button>
 <Button
 onClick={() => handleSetPresence(child.id, false)}
 className={`!px-3 !py-1 text-sm ${
 attendance.get(child.id) === false
 ? '!bg-macos-red hover:!bg-macos-red !text-white'
 : '!bg-fill-quaternary hover:!bg-fill-tertiary !text-secondary'
}`}
 >
 Отсутствует
 </Button>
 </div>
 </li>
 ))}
 {children.length === 0 && !loading && (
 <li className="p-4 text-center text-[14px] leading-relaxed text-tertiary">В этом классе нет детей или класс не выбран.</li>
 )}
 </ul>
 )}
 </Card>
 </div>
 );
}
