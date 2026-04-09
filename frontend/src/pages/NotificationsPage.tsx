// src/pages/NotificationsPage.tsx
import { useEffect, useMemo, useState} from"react";
import { BellRing, FileText, Megaphone, Trash2, AlertTriangle} from"lucide-react";
import { toast} from"sonner";
import { api} from"../lib/api";
import { Card} from"../components/Card";
import { Button} from"../components/ui/button";
import { Modal} from"../components/Modal";
import { ROLE_LABELS} from"../lib/constants";
import { useAuth} from"../hooks/useAuth";

type SystemNotification = {
 type:"CONTRACT_EXPIRING"|"MEDICAL_CHECKUP_DUE";
 message: string;
 employeeId: number;
 date: string;
};

type Broadcast = {
 id: number;
 title: string;
 content: string;
 targetRole?: keyof typeof ROLE_LABELS | null;
 targetGroup?: { id: number; name: string} | null;
 createdAt: string;
};

type Group = { id: number; name: string};

const iconMap: Record<SystemNotification["type"], JSX.Element> = {
 CONTRACT_EXPIRING: <FileText className="h-6 w-6 text-macos-red"/>,
 MEDICAL_CHECKUP_DUE: <BellRing className="h-6 w-6 text-macos-orange"/>,
};

const ROLE_OPTIONS = [{ value:"", label:"Все роли"}].concat(
 Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label}))
);

export default function NotificationsPage() {
 const { user} = useAuth();
 const canManageBroadcasts = useMemo(
 () => !!user && ["DIRECTOR","DEPUTY","ADMIN"].includes(user.role),
 [user]
 );

 const [systemNotifications, setSystemNotifications] = useState<SystemNotification[]>([]);
 const [systemLoading, setSystemLoading] = useState(true);
 const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
 const [broadcastLoading, setBroadcastLoading] = useState(true);
 const [groups, setGroups] = useState<Group[]>([]);
 const [formState, setFormState] = useState({
 title:"",
 content:"",
 targetRole:"",
 targetGroupId:"",
});
 const [saving, setSaving] = useState(false);
 const [deleteConfirm, setDeleteConfirm] = useState<Broadcast | null>(null);
 const [isDeleting, setIsDeleting] = useState(false);

 useEffect(() => {
 const loadSystemNotifications = async () => {
 setSystemLoading(true);
 try {
 const response = await api.get("/api/notifications");
 setSystemNotifications(response || []);
} catch (error) {
 toast.error("Не удалось загрузить уведомления", { description: (error as any)?.message});
} finally {
 setSystemLoading(false);
}
};

 loadSystemNotifications();
}, []);

 useEffect(() => {
 const loadBroadcasts = async () => {
 setBroadcastLoading(true);
 try {
 const response = await api.get("/api/notifications/broadcasts");
 setBroadcasts(response || []);
} catch (error) {
 toast.error("Не удалось загрузить объявления", { description: (error as any)?.message});
} finally {
 setBroadcastLoading(false);
}
};

 loadBroadcasts();
}, []);

 useEffect(() => {
 if (!canManageBroadcasts) return;
 const loadGroups = async () => {
 try {
 const data = await api.get("/api/groups");
 setGroups(data || []);
} catch (error) {
 toast.error("Классы недоступны", { description: (error as any)?.message});
}
};
 loadGroups();
}, [canManageBroadcasts]);

 const resetForm = () => {
 setFormState({ title:"", content:"", targetRole:"", targetGroupId:""});
};

 const handleCreateBroadcast = async (event: React.FormEvent) => {
 event.preventDefault();
 if (!formState.title.trim() || !formState.content.trim()) {
 toast.error("Заполните заголовок и текст объявления");
 return;
}
 setSaving(true);
 try {
 const payload = {
 title: formState.title.trim(),
 content: formState.content.trim(),
 targetRole: formState.targetRole || null,
 targetGroupId: formState.targetGroupId ? Number(formState.targetGroupId) : null,
};
 const created = await api.post("/api/notifications/broadcasts", payload);
 setBroadcasts((prev) => [created, ...prev]);
 toast.success("Объявление отправлено");
 resetForm();
} catch (error: any) {
 toast.error("Не удалось отправить объявление", { description: error?.message});
} finally {
 setSaving(false);
}
};

 const handleDeleteBroadcast = async () => {
 if (!deleteConfirm) return;
 setIsDeleting(true);
 try {
 await api.delete(`/api/notifications/broadcasts/${deleteConfirm.id}`);
 setBroadcasts((prev) => prev.filter((item) => item.id !== deleteConfirm.id));
 toast.success("Объявление удалено");
 setDeleteConfirm(null);
} catch (error: any) {
 toast.error("Не удалось удалить", { description: error?.message});
} finally {
 setIsDeleting(false);
}
};

 return (
 <div className="space-y-6">
 <h1 className="text-3xl font-bold">Уведомления и объявления</h1>

 <Card>
 <h2 className="text-xl font-semibold mb-4">Системные напоминания</h2>
 {systemLoading ? (
 <div className="p-4 text-center">Загрузка...</div>
 ) : systemNotifications.length === 0 ? (
 <div className="p-4 text-center text-secondary">Нет предстоящих событий.</div>
 ) : (
 <ul className="divide-y divide-gray-200">
 {systemNotifications.map((notification, index) => (
 <li key={index} className="p-4 flex items-start space-x-4">
 <div className="flex-shrink-0">{iconMap[notification.type]}</div>
 <div className="flex-1">
 <p className="font-semibold">{notification.message}</p>
 <p className="text-sm text-secondary">
 Событие произойдёт: {new Date(notification.date).toLocaleDateString()}
 </p>
 </div>
 </li>
 ))}
 </ul>
 )}
 </Card>

 <Card className="space-y-4">
 <div className="flex items-center justify-between">
 <h2 className="text-xl font-semibold">Массовые объявления</h2>
 {broadcastLoading && <span className="text-sm text-secondary">Обновляем...</span>}
 </div>

 {canManageBroadcasts && (
 <form className="space-y-4"onSubmit={handleCreateBroadcast}>
 <div className="grid gap-4 md:grid-cols-2">
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest text-primary mb-1">Заголовок</label>
 <input
 type="text"
 value={formState.title}
 onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value}))}
 className="w-full px-3 py-2 border border-field rounded-md"
 placeholder="Например, Инструктаж по пожарной безопасности"
 required
 />
 </div>
 <div className="grid gap-3 md:grid-cols-2">
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest text-primary mb-1">Роль</label>
 <select
 value={formState.targetRole}
 onChange={(event) => setFormState((prev) => ({ ...prev, targetRole: event.target.value}))}
 className="w-full px-3 py-2 border border-field rounded-md"
 >
 {ROLE_OPTIONS.map((option) => (
 <option key={option.value ||"all"} value={option.value}>
 {option.label}
 </option>
 ))}
 </select>
 </div>
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest text-primary mb-1">Класс</label>
 <select
 value={formState.targetGroupId}
 onChange={(event) => setFormState((prev) => ({ ...prev, targetGroupId: event.target.value}))}
 className="w-full px-3 py-2 border border-field rounded-md"
 >
 <option value="">Все классы</option>
 {groups.map((group) => (
 <option key={group.id} value={group.id}>
 {group.name}
 </option>
 ))}
 </select>
 </div>
 </div>
 </div>

 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest text-primary mb-1">Текст сообщения</label>
 <textarea
 value={formState.content}
 onChange={(event) => setFormState((prev) => ({ ...prev, content: event.target.value}))}
 className="w-full px-3 py-2 border border-field rounded-md"
 rows={4}
 placeholder="Коротко опишите событие, прикрепите инструкции..."
 required
 />
 </div>

 <div className="flex justify-end">
 <Button type="submit"disabled={saving}>
 <Megaphone className="h-4 w-4 mr-2"/>
 {saving ?"Отправляем...":"Отправить"}
 </Button>
 </div>
 </form>
 )}

 <div className="space-y-3">
 {broadcasts.length === 0 && !broadcastLoading && (
 <div className="text-sm text-secondary">История объявлений пока пустая.</div>
 )}
 <ul className="space-y-3">
 {broadcasts.map((broadcast) => (
 <li key={broadcast.id} className="mezon-field rounded-lg p-4">
 <div className="flex items-start justify-between gap-4">
 <div>
 <p className="text-sm text-secondary">
 {new Date(broadcast.createdAt).toLocaleString("ru-RU")}
 </p>
 <h3 className="text-[14px] font-semibold tracking-[-0.01em]">{broadcast.title}</h3>
 </div>
 {canManageBroadcasts && (
 <button
 type="button"
 onClick={() => setDeleteConfirm(broadcast)}
 className="text-tertiary hover:text-macos-red"
 aria-label="Удалить объявление"
 >
 <Trash2 className="h-4 w-4"/>
 </button>
 )}
 </div>
 <p className="mt-2 text-primary whitespace-pre-line">{broadcast.content}</p>
 <div className="mt-2 text-sm text-secondary flex flex-wrap gap-4">
 <span>
 Роли: {broadcast.targetRole ? ROLE_LABELS[broadcast.targetRole] :"Все"}
 </span>
 <span>
 Класс: {broadcast.targetGroup?.name ||"Все классы"}
 </span>
 </div>
 </li>
 ))}
 </ul>
 </div>
 </Card>

 <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Удаление объявления">
 <div className="p-4">
 <div className="flex items-start gap-4">
 <div className="flex-shrink-0 w-10 h-10 bg-[rgba(255,59,48,0.12)] rounded-full flex items-center justify-center">
 <AlertTriangle className="h-5 w-5 text-macos-red"/>
 </div>
 <div className="flex-1">
 <p className="font-medium text-primary">Вы уверены, что хотите удалить это объявление?</p>
 {deleteConfirm && (
 <div className="mt-2 p-3 bg-fill-quaternary rounded-md">
 <p className="text-[11px] font-medium uppercase tracking-widest">{deleteConfirm.title}</p>
 <p className="text-xs text-secondary mt-1">
 {new Date(deleteConfirm.createdAt).toLocaleDateString('ru-RU')}
 </p>
 </div>
 )}
 <p className="text-sm text-secondary mt-2">Это действие нельзя отменить.</p>
 </div>
 </div>
 <div className="flex justify-end gap-3 mt-6">
 <Button variant="outline"onClick={() => setDeleteConfirm(null)} disabled={isDeleting}>
 Отмена
 </Button>
 <Button variant="destructive"onClick={handleDeleteBroadcast} disabled={isDeleting}>
 {isDeleting ? 'Удаление...' : 'Удалить'}
 </Button>
 </div>
 </div>
 </Modal>
 </div>
 );
}
