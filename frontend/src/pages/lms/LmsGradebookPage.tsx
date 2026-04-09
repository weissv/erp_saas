// src/pages/lms/LmsGradebookPage.tsx
import { useEffect, useState} from"react";
import {
 BookOpen,
 Users,
 Plus,
 Filter,
} from"lucide-react";
import { lmsApi} from"../../lib/lms-api";
import { useAuth} from"../../hooks/useAuth";
import type { LmsSchoolClass, LmsSubject, GradebookData} from"../../types/lms";
import { toast} from"sonner";
import { useLmsClasses} from"../../hooks/lms/useLmsClasses";
import { useLmsSubjects} from"../../hooks/lms/useLmsSubjects";
import { useLmsGradebook} from"../../hooks/lms/useLmsGradebook";

export default function LmsGradebookPage() {
 const { user} = useAuth();
 const { classes, loading: classesLoading, error: classesError} = useLmsClasses({ isActive: true});
 const { subjects, loading: subjectsLoading, error: subjectsError} = useLmsSubjects();
 const [selectedClass, setSelectedClass] = useState<number | null>(null);
 const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
 const { gradebook, loading: gradebookLoading, error: gradebookError, refetch: refetchGradebook} = useLmsGradebook(selectedClass, selectedSubject);
 const loading = classesLoading || subjectsLoading || (selectedClass && selectedSubject ? gradebookLoading : false);
 const [showAddGradeModal, setShowAddGradeModal] = useState(false);
 const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

 const isTeacher = user && ["DIRECTOR","DEPUTY","ADMIN","TEACHER"].includes(user.role);

 useEffect(() => {
 if (classes.length > 0 && !selectedClass) {
 setSelectedClass(classes[0].id);
}
}, [classes, selectedClass]);

 useEffect(() => {
 if (subjects.length > 0 && !selectedSubject) {
 setSelectedSubject(subjects[0].id);
}
}, [subjects, selectedSubject]);

 useEffect(() => {
 const err = classesError || subjectsError || gradebookError;
 if (err) {
 console.error("Failed to load gradebook data:", err);
 toast.error("Не удалось загрузить данные");
}
}, [classesError, subjectsError, gradebookError]);

 const handleAddGrade = async (studentId: string, value: number, date: string, comment?: string) => {
 if (!selectedClass || !selectedSubject) return;
 
 try {
 await lmsApi.createGrade({
 studentId,
 subjectId: selectedSubject,
 classId: selectedClass,
 value,
 date,
 comment,
});
 toast.success("Оценка добавлена");
 refetchGradebook();
} catch (error) {
 console.error("Failed to add grade:", error);
 toast.error("Не удалось добавить оценку");
}
};

 const getGradeColor = (grade: number) => {
 if (grade >= 4) return"bg-[rgba(52,199,89,0.12)] text-macos-green";
 if (grade >= 3) return"bg-[rgba(255,204,0,0.12)] text-macos-orange";
 return"bg-[rgba(255,59,48,0.12)] text-macos-red";
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
 <div>
 <h1 className="text-[24px] font-bold tracking-[-0.025em] leading-tight text-primary">Журнал оценок</h1>
 <p className="text-secondary">Выставление и просмотр оценок учеников</p>
 </div>

 <div className="bg-white rounded-xl shadow-subtle border border-card p-4">
 <div className="flex flex-col sm:flex-row gap-4">
 <div className="flex-1">
 <label className="block text-[11px] font-medium uppercase tracking-widest text-primary mb-1">
 <Users className="inline h-4 w-4 mr-1"/>
 Класс
 </label>
 <select
 value={selectedClass ??""}
 onChange={(e) => setSelectedClass(e.target.value ? Number(e.target.value) : null)}
 className="w-full px-3 py-2 mezon-field rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-macos-blue/30"
 >
 <option value="">Выберите класс</option>
 {classes.map((cls) => (
 <option key={cls.id} value={cls.id}>
 {cls.name} ({cls.academicYear})
 </option>
 ))}
 </select>
 </div>
 <div className="flex-1">
 <label className="block text-[11px] font-medium uppercase tracking-widest text-primary mb-1">
 <BookOpen className="inline h-4 w-4 mr-1"/>
 Предмет
 </label>
 <select
 value={selectedSubject ||""}
 onChange={(e) => setSelectedSubject(e.target.value || null)}
 className="w-full px-3 py-2 mezon-field rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-macos-blue/30"
 >
 <option value="">Выберите предмет</option>
 {subjects.map((subj) => (
 <option key={subj.id} value={subj.id}>
 {subj.name}
 </option>
 ))}
 </select>
 </div>
 </div>
 </div>

 {selectedClass && selectedSubject ? (
 <div className="bg-white rounded-xl shadow-subtle border border-card overflow-hidden">
 {gradebook && gradebook.students?.length > 0 ? (
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-fill-quaternary">
 <tr>
 <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-widest text-primary sticky left-0 bg-fill-quaternary z-10">
 Ученик
 </th>
 {(gradebook.dates ?? []).map((date) => (
 <th key={date} className="px-2 py-3 text-center text-[11px] font-medium uppercase tracking-widest text-primary min-w-[60px]">
 {new Date(date).toLocaleDateString("ru-RU", { day:"2-digit", month:"2-digit"})}
 </th>
 ))}
 <th className="px-4 py-3 text-center text-[11px] font-medium uppercase tracking-widest text-primary">
 Средний
 </th>
 {isTeacher && (
 <th className="px-4 py-3 text-center text-[11px] font-medium uppercase tracking-widest text-primary">
 Действия
 </th>
 )}
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100">
 {(gradebook.students ?? []).map(({ student, grades, average}) => (
 <tr key={student.id} className="hover:bg-fill-quaternary">
 <td className="px-4 py-3 text-[11px] font-medium uppercase tracking-widest text-primary sticky left-0 bg-white z-10">
 {student.student?.lastName} {student.student?.firstName}
 </td>
 {(gradebook.dates ?? []).map((date) => {
 const gradeForDate = grades.find(
 (g) => new Date(g.date).toISOString().split('T')[0] === date
 );
 return (
 <td key={date} className="px-2 py-3 text-center">
 {gradeForDate ? (
 <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-semibold ${getGradeColor(gradeForDate.value)}`}>
 {gradeForDate.value}
 </span>
 ) : (
 <span className="text-tertiary">-</span>
 )}
 </td>
 );
})}
 <td className="px-4 py-3 text-center">
 <span className={`inline-flex items-center justify-center w-10 h-8 rounded-lg font-semibold ${getGradeColor(average)}`}>
 {average > 0 ? average.toFixed(1) :"-"}
 </span>
 </td>
 {isTeacher && (
 <td className="px-4 py-3 text-center">
 <button
 onClick={() => {
 setSelectedStudent(student.id);
 setShowAddGradeModal(true);
}}
 className="inline-flex items-center gap-1 text-macos-blue hover:text-macos-blue text-sm"
 >
 <Plus className="h-4 w-4"/>
 Оценка
 </button>
 </td>
 )}
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 ) : (
 <div className="p-12 text-center">
 <BookOpen className="h-12 w-12 text-tertiary mx-auto mb-4"/>
 <p className="text-secondary mb-4">
 {gradebook?.students.length === 0
 ?"В этом классе пока нет учеников"
 :"Оценки пока не выставлены"}
 </p>
 {isTeacher && (
 <button
 onClick={() => setShowAddGradeModal(true)}
 className="inline-flex items-center gap-2 text-macos-blue hover:text-macos-blue"
 >
 <Plus className="h-5 w-5"/>
 Добавить оценку
 </button>
 )}
 </div>
 )}
 </div>
 ) : (
 <div className="bg-white rounded-xl shadow-subtle border border-card p-12 text-center">
 <Filter className="h-12 w-12 text-tertiary mx-auto mb-4"/>
 <p className="text-secondary">Выберите класс и предмет для просмотра журнала</p>
 </div>
 )}

 {showAddGradeModal && selectedClass && selectedSubject && (
 <AddGradeModal
 classId={selectedClass}
 subjectId={selectedSubject}
 studentId={selectedStudent}
 students={gradebook?.students.map((s) => s.student) || []}
 onClose={() => {
 setShowAddGradeModal(false);
 setSelectedStudent(null);
}}
 onSave={handleAddGrade}
 />
 )}
 </div>
 );
}

interface StudentForSelect {
 id: string;
 studentId: number;
 student?: {
 id: number;
 firstName: string;
 lastName: string;
};
}

function AddGradeModal({
 studentId,
 students,
 onClose,
 onSave,
}: {
 classId: number;
 subjectId: string;
 studentId: string | null;
 students: StudentForSelect[];
 onClose: () => void;
 onSave: (studentId: string, value: number, date: string, comment?: string) => void;
}) {
 const [formData, setFormData] = useState({
 studentId: studentId || (students[0]?.id ||""),
 grade: 5,
 date: new Date().toISOString().split("T")[0],
 comment:"",
});
 const [loading, setLoading] = useState(false);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setLoading(true);
 await onSave(formData.studentId, formData.grade, formData.date, formData.comment || undefined);
 setLoading(false);
 onClose();
};

 return (
 <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
 <h2 className="text-[24px] font-bold tracking-[-0.025em] leading-tight text-primary mb-4">Добавить оценку</h2>
 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest text-primary mb-1">
 Ученик
 </label>
 <select
 value={formData.studentId}
 onChange={(e) => setFormData({ ...formData, studentId: e.target.value})}
 className="w-full px-3 py-2 mezon-field rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-macos-blue/30"
 >
 {students.map((s) => (
 <option key={s.id} value={s.id}>
 {s.student?.lastName} {s.student?.firstName}
 </option>
 ))}
 </select>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest text-primary mb-1">
 Оценка
 </label>
 <select
 value={formData.grade}
 onChange={(e) => setFormData({ ...formData, grade: Number(e.target.value)})}
 className="w-full px-3 py-2 mezon-field rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-macos-blue/30"
 >
 {[5, 4, 3, 2, 1].map((g) => (
 <option key={g} value={g}>
 {g}
 </option>
 ))}
 </select>
 </div>
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest text-primary mb-1">
 Дата
 </label>
 <input
 type="date"
 value={formData.date}
 onChange={(e) => setFormData({ ...formData, date: e.target.value})}
 className="w-full px-3 py-2 mezon-field rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-macos-blue/30"
 />
 </div>
 </div>
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest text-primary mb-1">
 Комментарий (необязательно)
 </label>
 <input
 type="text"
 value={formData.comment}
 onChange={(e) => setFormData({ ...formData, comment: e.target.value})}
 className="w-full px-3 py-2 mezon-field rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-macos-blue/30"
 placeholder="За что оценка..."
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
 {loading ?"Сохранение...":"Сохранить"}
 </button>
 </div>
 </form>
 </div>
 </div>
 );
}
