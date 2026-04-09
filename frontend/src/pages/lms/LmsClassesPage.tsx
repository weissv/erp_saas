// src/pages/lms/LmsClassesPage.tsx
import { useEffect, useState} from"react";
import {
 Users,
 Plus,
 Search,
 Edit,
 X,
} from"lucide-react";
import { lmsApi} from"../../lib/lms-api";
import { useAuth} from"../../hooks/useAuth";
import type { LmsSchoolClass} from"../../types/lms";
import { toast} from"sonner";
import { useLmsClasses} from"../../hooks/lms/useLmsClasses";
import { Skeleton} from"../../components/ui/LoadingState";
import { EmptyState} from"../../components/ui/EmptyState";
import { MacosAlertDialog} from"../../components/MacosAlertDialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter} from"../../components/ui/sheet";

export default function LmsClassesPage() {
 const { user} = useAuth();
 const { classes, loading, refetch, error} = useLmsClasses({ isActive: true});
 const [searchTerm, setSearchTerm] = useState("");
 const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
 const [showCreateModal, setShowCreateModal] = useState(false);
 const [editingClass, setEditingClass] = useState<LmsSchoolClass | null>(null);

 const isAdmin = user && ["DIRECTOR","DEPUTY","ADMIN"].includes(user.role);

 const filteredClasses = classes.filter((cls) => {
 const matchesSearch = cls.name.toLowerCase().includes(searchTerm.toLowerCase());
 const matchesGrade = selectedGrade === null || cls.grade === selectedGrade;
 return matchesSearch && matchesGrade;
});

 const grades = [...new Set(classes.map((c) => c.grade).filter((g): g is number => g !== null && g !== undefined))].sort((a, b) => a - b);

 useEffect(() => {
 if (error) {
 console.error("Failed to fetch classes:", error);
 toast.error("Не удалось загрузить классы");
}
}, [error]);

 // Group classes by grade
 const classesByGrade = filteredClasses.reduce((acc, cls) => {
 const grade = cls.grade ?? 0;
 if (!acc[grade]) acc[grade] = [];
 acc[grade].push(cls);
 return acc;
}, {} as Record<number, LmsSchoolClass[]>);

 if (loading) {
 return (
 <div className="space-y-6">
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
 <div>
 <Skeleton height={28} width="35%" className="mb-2" />
 <Skeleton height={16} width="55%" />
 </div>
 <Skeleton height={36} width={140} />
 </div>
 <Skeleton height={56} rounded="lg" />
 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
 {Array.from({ length: 6 }).map((_, i) => (
 <div key={i} className="border border-border rounded-xl p-5 space-y-3">
 <div className="flex items-center justify-between">
 <Skeleton height={20} width="50%" />
 <Skeleton height={20} width={60} rounded="full" />
 </div>
 <Skeleton height={14} width="35%" />
 <div className="flex justify-between pt-2 border-t border-border">
 <Skeleton height={12} width={80} />
 <Skeleton height={12} width={60} />
 </div>
 </div>
 ))}
 </div>
 </div>
 );
}

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
 <div>
 <h1 className="text-[24px] font-bold tracking-[-0.025em] leading-tight text-primary">Классы</h1>
 <p className="text-secondary">
 Управление школьными классами и учениками
 <span className="text-xs text-tertiary ml-2">
 (синхронизировано с ERP)
 </span>
 </p>
 </div>
 {isAdmin && (
 <div className="flex gap-2">
 <a
 href="/groups"
 className="inline-flex items-center gap-2 border border-field text-primary px-4 py-2 rounded-lg font-medium hover:bg-fill-quaternary macos-transition"
 >
 <Edit className="h-4 w-4"/>
 Управление в ERP
 </a>
 <button
 onClick={() => setShowCreateModal(true)}
 className="inline-flex items-center gap-2 bg-macos-blue text-white px-4 py-2 rounded-lg font-medium hover:bg-macos-blue macos-transition"
 >
 <Plus className="h-5 w-5"/>
 Добавить класс
 </button>
 </div>
 )}
 </div>

 {/* Filters */}
 <div className="bg-white rounded-xl shadow-subtle border border-card p-4">
 <div className="flex flex-col sm:flex-row gap-4">
 <div className="relative flex-1">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-tertiary"/>
 <input
 type="text"
 placeholder="Поиск по названию класса..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full pl-10 pr-4 py-2 mezon-field rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-macos-blue/30"
 />
 </div>
 <div className="flex gap-2 flex-wrap">
 <button
 onClick={() => setSelectedGrade(null)}
 className={`px-4 py-2 rounded-lg text-[11px] font-medium uppercase tracking-widest macos-transition ${
 selectedGrade === null
 ?"bg-macos-blue text-white"
 :"bg-fill-tertiary text-primary hover:bg-fill-secondary"
}`}
 >
 Все
 </button>
 {grades.map((grade) => (
 <button
 key={grade}
 onClick={() => setSelectedGrade(grade)}
 className={`px-4 py-2 rounded-lg text-[11px] font-medium uppercase tracking-widest macos-transition ${
 selectedGrade === grade
 ?"bg-macos-blue text-white"
 :"bg-fill-tertiary text-primary hover:bg-fill-secondary"
}`}
 >
 {grade} класс
 </button>
 ))}
 </div>
 </div>
 </div>

 {/* Classes Grid */}
 {Object.keys(classesByGrade).length === 0 ? (
 <div className="bg-white rounded-xl shadow-subtle border border-card p-12 text-center">
 <Users className="h-12 w-12 text-tertiary mx-auto mb-4"/>
 <p className="text-secondary">Классы не найдены</p>
 {isAdmin && (
 <button
 onClick={() => setShowCreateModal(true)}
 className="mt-4 inline-flex items-center gap-2 text-macos-blue hover:text-macos-blue"
 >
 <Plus className="h-5 w-5"/>
 Добавить первый класс
 </button>
 )}
 </div>
 ) : (
 <div className="space-y-8">
 {Object.entries(classesByGrade)
 .sort(([a], [b]) => Number(a) - Number(b))
 .map(([grade, gradeClasses]) => (
 <div key={grade}>
 <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-primary mb-4">
 {grade} класс
 </h2>
 <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
 {gradeClasses.map((cls) => (
 <div
 key={cls.id}
 onClick={() => setEditingClass(cls)}
 className="bg-white rounded-xl shadow-subtle border border-card p-5 hover:shadow-md transition-shadow group cursor-pointer"
 >
 <div className="flex items-start justify-between mb-3">
 <div className="w-12 h-12 bg-tint-blue rounded-xl flex items-center justify-center">
 <span className="text-[24px] font-bold tracking-[-0.025em] leading-tight text-macos-blue">{cls.name}</span>
 </div>
 <Edit className="h-5 w-5 text-tertiary group-hover:text-macos-blue macos-transition"/>
 </div>
 <div className="space-y-2">
 <div className="flex items-center gap-2 text-sm text-secondary">
 <Users className="h-4 w-4"/>
 <span>{cls.studentsCount || 0} учеников</span>
 </div>
 {cls.teacher && (
 <p className="text-sm text-secondary truncate">
 Классный рук.: {cls.teacher.lastName} {cls.teacher.firstName?.charAt(0)}.
 </p>
 )}
 {cls.academicYear && (
 <p className="text-xs text-tertiary">{cls.academicYear}</p>
 )}
 </div>
 </div>
 ))}
 </div>
 </div>
 ))}
 </div>
 )}

 {/* Create Class Sheet */}
 <CreateClassModal
 isOpen={showCreateModal}
 onClose={() => setShowCreateModal(false)}
 onCreated={() => {
 setShowCreateModal(false);
 refetch();
}}
 />

 {/* Edit Class Sheet */}
 <EditClassModal
 isOpen={editingClass !== null}
 classData={editingClass}
 onClose={() => setEditingClass(null)}
 onUpdated={() => {
 setEditingClass(null);
 refetch();
}}
 onDeleted={() => {
 setEditingClass(null);
 refetch();
}}
 />
 </div>
 );
}

function CreateClassModal({
 isOpen,
 onClose,
 onCreated,
}: {
 isOpen: boolean;
 onClose: () => void;
 onCreated: () => void;
}) {
 const [formData, setFormData] = useState({
 name: "",
 grade: 1,
 section: "",
 academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
 teacherId: undefined as number | undefined,
});
 const [loading, setLoading] = useState(false);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setLoading(true);
 try {
 await lmsApi.createClass({
 name: formData.section ? `${formData.grade}${formData.section}` : `${formData.grade}`,
 grade: formData.grade,
 academicYear: formData.academicYear,
 teacherId: formData.teacherId,
});
 toast.success("Класс создан");
 onCreated();
} catch (error) {
 console.error("Failed to create class:", error);
 toast.error("Не удалось создать класс");
} finally {
 setLoading(false);
}
};

 return (
 <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
 <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
 <SheetHeader className="mb-6">
 <SheetTitle>Добавить класс</SheetTitle>
 <SheetDescription>Создайте новый школьный класс</SheetDescription>
 </SheetHeader>
 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">
 Класс
 </label>
 <select
 value={formData.grade}
 onChange={(e) => setFormData({ ...formData, grade: Number(e.target.value)})}
 className="w-full px-3 py-2 mezon-field rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-macos-blue/30"
 >
 {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((g) => (
 <option key={g} value={g}>
 {g} класс
 </option>
 ))}
 </select>
 </div>
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">
 Буква
 </label>
 <select
 value={formData.section}
 onChange={(e) => setFormData({ ...formData, section: e.target.value})}
 className="w-full px-3 py-2 mezon-field rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-macos-blue/30"
 >
 <option value="">Без буквы</option>
 {["А", "Б", "В", "Г", "Д"].map((s) => (
 <option key={s} value={s}>
 {s}
 </option>
 ))}
 </select>
 </div>
 </div>
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">
 Учебный год
 </label>
 <input
 type="text"
 value={formData.academicYear}
 onChange={(e) => setFormData({ ...formData, academicYear: e.target.value})}
 className="w-full px-3 py-2 mezon-field rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-macos-blue/30"
 placeholder="2024-2025"
 />
 </div>
 <SheetFooter className="pt-4">
 <button
 type="button"
 onClick={onClose}
 className="flex-1 px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted/50 transition-colors duration-200"
 >
 Отмена
 </button>
 <button
 type="submit"
 disabled={loading}
 className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50"
 >
 {loading ? "Создание..." : "Создать"}
 </button>
 </SheetFooter>
 </form>
 </SheetContent>
 </Sheet>
 );
}

function EditClassModal({
 isOpen,
 classData,
 onClose,
 onUpdated,
 onDeleted,
}: {
 isOpen: boolean;
 classData: LmsSchoolClass | null;
 onClose: () => void;
 onUpdated: () => void;
 onDeleted: () => void;
}) {
 const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

 // Извлекаем букву из названия класса (например"2А"->"А")
 const extractSection = (name: string) => {
 const match = name.match(/\d+([А-Я])/i);
 return match ? match[1].toUpperCase() : "";
};

 const [formData, setFormData] = useState({
 name: classData?.name || "",
 grade: classData?.grade || 1,
 section: extractSection(classData?.name || ""),
 academicYear: classData?.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
 teacherId: classData?.teacherId || undefined as number | undefined,
 capacity: classData?.capacity || undefined as number | undefined,
 description: classData?.description || "",
});
 const [loading, setLoading] = useState(false);
 const [deleting, setDeleting] = useState(false);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!classData) return;
 setLoading(true);
 try {
 await lmsApi.updateClass(classData.id, {
 name: formData.section ? `${formData.grade}${formData.section}` : `${formData.grade}`,
 grade: formData.grade,
 academicYear: formData.academicYear,
 teacherId: formData.teacherId,
 capacity: formData.capacity,
 description: formData.description || undefined,
});
 toast.success("Класс обновлён");
 onUpdated();
} catch (error) {
 console.error("Failed to update class:", error);
 toast.error("Не удалось обновить класс");
} finally {
 setLoading(false);
}
};

 const handleDelete = async () => {
 if (!classData) return;
 setDeleting(true);
 try {
 await lmsApi.deleteClass(classData.id);
 toast.success("Класс удалён");
 setIsConfirmDeleteOpen(false);
 onDeleted();
} catch (error) {
 console.error("Failed to delete class:", error);
 toast.error("Не удалось удалить класс");
} finally {
 setDeleting(false);
}
};

 return (
 <>
 <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
 <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
 <SheetHeader className="mb-6">
 <SheetTitle>Редактировать класс</SheetTitle>
 <SheetDescription>{classData?.name}</SheetDescription>
 </SheetHeader>
 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">
 Класс
 </label>
 <select
 value={formData.grade}
 onChange={(e) => setFormData({ ...formData, grade: Number(e.target.value)})}
 className="w-full px-3 py-2 mezon-field rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-macos-blue/30"
 >
 {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((g) => (
 <option key={g} value={g}>
 {g} класс
 </option>
 ))}
 </select>
 </div>
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">
 Буква
 </label>
 <select
 value={formData.section}
 onChange={(e) => setFormData({ ...formData, section: e.target.value})}
 className="w-full px-3 py-2 mezon-field rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-macos-blue/30"
 >
 <option value="">Без буквы</option>
 {["А", "Б", "В", "Г", "Д", "Е", "Ж", "З"].map((s) => (
 <option key={s} value={s}>
 {s}
 </option>
 ))}
 </select>
 </div>
 </div>
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">
 Учебный год
 </label>
 <input
 type="text"
 value={formData.academicYear}
 onChange={(e) => setFormData({ ...formData, academicYear: e.target.value})}
 className="w-full px-3 py-2 mezon-field rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-macos-blue/30"
 placeholder="2024-2025"
 />
 </div>
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">
 Вместимость
 </label>
 <input
 type="number"
 value={formData.capacity || ""}
 onChange={(e) => setFormData({ ...formData, capacity: e.target.value ? Number(e.target.value) : undefined})}
 className="w-full px-3 py-2 mezon-field rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-macos-blue/30"
 placeholder="30"
 />
 </div>
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">
 Описание
 </label>
 <textarea
 value={formData.description}
 onChange={(e) => setFormData({ ...formData, description: e.target.value})}
 className="w-full px-3 py-2 mezon-field rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-macos-blue/30"
 rows={2}
 placeholder="Дополнительная информация о классе"
 />
 </div>

 {/* Информация о классе */}
 {classData && (
 <div className="bg-muted/40 rounded-lg p-3 text-sm">
 <div className="flex items-center gap-2 text-muted-foreground">
 <Users className="h-4 w-4"/>
 <span className="tabular-nums">{classData.studentsCount || 0} учеников в классе</span>
 </div>
 {classData.teacher && (
 <p className="text-muted-foreground mt-1">
 Классный рук.: {classData.teacher.lastName} {classData.teacher.firstName}
 </p>
 )}
 </div>
 )}

 <SheetFooter className="pt-4 flex gap-2">
 <button
 type="button"
 onClick={() => setIsConfirmDeleteOpen(true)}
 disabled={deleting}
 className="px-4 py-2 border border-destructive/30 text-destructive rounded-lg hover:bg-destructive/5 transition-colors duration-200 disabled:opacity-50"
 >
 {deleting ? "..." : "Удалить"}
 </button>
 <button
 type="button"
 onClick={onClose}
 className="flex-1 px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted/50 transition-colors duration-200"
 >
 Отмена
 </button>
 <button
 type="submit"
 disabled={loading}
 className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50"
 >
 {loading ? "Сохранение..." : "Сохранить"}
 </button>
 </SheetFooter>
 </form>
 </SheetContent>
 </Sheet>

 <MacosAlertDialog
 isOpen={isConfirmDeleteOpen}
 title={`Удалить класс ${classData?.name}?`}
 description="Это действие нельзя отменить. Все данные класса будут удалены."
 onClose={() => setIsConfirmDeleteOpen(false)}
 cancelAction={{ label: "Отмена", onClick: () => setIsConfirmDeleteOpen(false) }}
 primaryAction={{ label: "Удалить", onClick: handleDelete }}
 />
 </>
 );
}
