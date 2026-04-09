// src/pages/ExamResultsPage.tsx
// Страница результатов контрольной для учителей
import { useState, useEffect} from"react";
import { useParams, useNavigate} from"react-router-dom";
import {
 ArrowLeft,
 Download,
 Users,
 CheckCircle,
 XCircle,
 Clock,
 BarChart,
 Edit,
 Eye,
 ChevronDown,
 ChevronUp,
 AlertTriangle,
} from"lucide-react";
import { examsApi} from"../lib/exams-api";
import { Exam, ExamSubmission, ExamAnswer} from"../types/exam";
import { toast} from"sonner";

export default function ExamResultsPage() {
 const { id} = useParams<{ id: string}>();
 const navigate = useNavigate();

 const [loading, setLoading] = useState(true);
 const [exam, setExam] = useState<Exam | null>(null);
 const [submissions, setSubmissions] = useState<ExamSubmission[]>([]);
 const [stats, setStats] = useState<{
 total: number;
 completed: number;
 passed: number;
 avgScore: number;
 avgPercentage: number;
} | null>(null);
 const [expandedSubmission, setExpandedSubmission] = useState<string | null>(null);
 const [selectedSubmission, setSelectedSubmission] = useState<ExamSubmission | null>(null);

 useEffect(() => {
 if (id) fetchResults();
}, [id]);

 const fetchResults = async () => {
 setLoading(true);
 try {
 const data = await examsApi.getResults(id!);
 setExam(data.exam);
 setSubmissions(data.submissions);
 setStats(data.stats);
} catch (error) {
 toast.error("Не удалось загрузить результаты");
 navigate("/exams");
} finally {
 setLoading(false);
}
};

 const fetchSubmissionDetails = async (submissionId: string) => {
 try {
 const data = await examsApi.getSubmission(id!, submissionId);
 setSelectedSubmission(data);
} catch (error) {
 toast.error("Не удалось загрузить детали");
}
};

 const handleGrade = async (answerId: string, score: number, feedback?: string) => {
 try {
 await examsApi.gradeAnswer(answerId, { score, feedback});
 toast.success("Оценка сохранена");
 if (selectedSubmission) {
 fetchSubmissionDetails(selectedSubmission.id);
}
 fetchResults();
} catch (error) {
 toast.error("Ошибка при сохранении оценки");
}
};

 const exportResults = async () => {
 if (!exam) return;
 
 try {
 // Используем серверный endpoint для полного экспорта
 const response = await fetch(`/api/exams/${id}/export`, {
 credentials: 'include'
});
 
 if (!response.ok) throw new Error('Export failed');
 
 const blob = await response.blob();
 const url = URL.createObjectURL(blob);
 const a = document.createElement("a");
 a.href = url;
 a.download = `${exam.title}_результаты_${new Date().toISOString().split('T')[0]}.csv`;
 a.click();
 URL.revokeObjectURL(url);
 toast.success("Результаты экспортированы");
} catch (error) {
 // Fallback: локальный экспорт
 if (!submissions.length) {
 toast.error("Нет данных для экспорта");
 return;
}
 
 const headers = ["Имя","Класс","Дата сдачи","Баллы","Процент","Результат"];
 const rows = submissions.map((s) => [
 s.studentName,
 s.studentClass ||"",
 s.submittedAt ? new Date(s.submittedAt).toLocaleString("ru") :"-",
 `${s.totalScore || 0}/${s.maxScore}`,
 `${Math.round(s.percentage || 0)}%`,
 s.passed ?"Зачёт":"Незачёт",
 ]);

 const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
 const blob = new Blob(["\uFEFF"+ csv], { type:"text/csv;charset=utf-8"});
 const url = URL.createObjectURL(blob);
 const a = document.createElement("a");
 a.href = url;
 a.download = `${exam.title}_результаты.csv`;
 a.click();
 URL.revokeObjectURL(url);
}
};

 const formatDate = (date?: string | null) => {
 if (!date) return"—";
 return new Date(date).toLocaleString("ru", {
 day:"numeric",
 month:"short",
 hour:"2-digit",
 minute:"2-digit",
});
};

 if (loading) {
 return (
 <div className="flex items-center justify-center min-h-[400px]">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
 </div>
 );
}

 if (!exam) return null;

 return (
 <div className="space-y-6">
 {/* Заголовок */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <button
 onClick={() => navigate("/exams")}
 className="p-2 text-secondary hover:text-primary hover:bg-fill-tertiary rounded-lg"
 >
 <ArrowLeft className="h-5 w-5"/>
 </button>
 <div>
 <h1 className="text-[24px] font-bold tracking-[-0.025em] leading-tight text-primary">
 Результаты: {exam.title}
 </h1>
 <p className="text-secondary text-sm mt-1">{exam.subject}</p>
 </div>
 </div>
 <button
 onClick={exportResults}
 className="flex items-center gap-2 px-4 py-2 bg-fill-tertiary text-primary rounded-lg hover:bg-fill-secondary"
 >
 <Download className="h-5 w-5"/>
 Экспорт CSV
 </button>
 </div>

 {/* Статистика */}
 {stats && (
 <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
 <div className="bg-white rounded-xl shadow-subtle border border-card p-4">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-[rgba(0,122,255,0.12)] rounded-lg">
 <Users className="h-5 w-5 text-macos-blue"/>
 </div>
 <div>
 <p className="text-sm text-secondary">Всего</p>
 <p className="text-[24px] font-bold tracking-[-0.025em] leading-tight text-primary">{stats.total}</p>
 </div>
 </div>
 </div>
 <div className="bg-white rounded-xl shadow-subtle border border-card p-4">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-tint-blue rounded-lg">
 <CheckCircle className="h-5 w-5 text-macos-blue"/>
 </div>
 <div>
 <p className="text-sm text-secondary">Завершено</p>
 <p className="text-[24px] font-bold tracking-[-0.025em] leading-tight text-primary">{stats.completed}</p>
 </div>
 </div>
 </div>
 <div className="bg-white rounded-xl shadow-subtle border border-card p-4">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-[rgba(52,199,89,0.12)] rounded-lg">
 <CheckCircle className="h-5 w-5 text-macos-green"/>
 </div>
 <div>
 <p className="text-sm text-secondary">Зачёт</p>
 <p className="text-[24px] font-bold tracking-[-0.025em] leading-tight text-primary">{stats.passed}</p>
 </div>
 </div>
 </div>
 <div className="bg-white rounded-xl shadow-subtle border border-card p-4">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-[rgba(175,82,222,0.12)] rounded-lg">
 <BarChart className="h-5 w-5 text-[var(--color-purple)]"/>
 </div>
 <div>
 <p className="text-sm text-secondary">Средний балл</p>
 <p className="text-[24px] font-bold tracking-[-0.025em] leading-tight text-primary">
 {stats.avgScore.toFixed(1)}
 </p>
 </div>
 </div>
 </div>
 <div className="bg-white rounded-xl shadow-subtle border border-card p-4">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-[rgba(255,204,0,0.12)] rounded-lg">
 <BarChart className="h-5 w-5 text-macos-orange"/>
 </div>
 <div>
 <p className="text-sm text-secondary">Средний %</p>
 <p className="text-[24px] font-bold tracking-[-0.025em] leading-tight text-primary">
 {stats.avgPercentage.toFixed(0)}%
 </p>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Список прохождений */}
 <div className="bg-white rounded-xl shadow-subtle border border-card overflow-hidden">
 <div className="p-4 border-b bg-fill-quaternary">
 <h2 className="font-semibold text-primary">Прохождения ({submissions.length})</h2>
 </div>

 {submissions.length === 0 ? (
 <div className="p-8 text-center text-secondary">
 <Users className="h-12 w-12 mx-auto mb-4 text-tertiary"/>
 <p>Пока никто не проходил контрольную</p>
 </div>
 ) : (
 <div className="divide-y">
 {submissions.map((submission) => (
 <div key={submission.id}>
 {/* Строка прохождения */}
 <div
 className="flex items-center gap-4 p-4 hover:bg-fill-quaternary cursor-pointer"
 onClick={() => {
 if (expandedSubmission === submission.id) {
 setExpandedSubmission(null);
 setSelectedSubmission(null);
} else {
 setExpandedSubmission(submission.id);
 fetchSubmissionDetails(submission.id);
}
}}
 >
 <div className="flex-shrink-0">
 {submission.passed === true ? (
 <CheckCircle className="h-6 w-6 text-macos-green"/>
 ) : submission.passed === false ? (
 <XCircle className="h-6 w-6 text-macos-red"/>
 ) : (
 <Clock className="h-6 w-6 text-macos-orange"/>
 )}
 </div>
 <div className="flex-1 min-w-0">
 <p className="font-medium text-primary">{submission.studentName}</p>
 <p className="text-sm text-secondary">
 {submission.studentClass && `${submission.studentClass} · `}
 {formatDate(submission.submittedAt)}
 </p>
 </div>
 <div className="text-right">
 <p className="font-semibold text-primary">
 {submission.totalScore ?? 0}/{submission.maxScore}
 </p>
 <p className="text-sm text-secondary">
 {Math.round(submission.percentage ?? 0)}%
 </p>
 </div>
 <div className="flex items-center gap-2">
 {!submission.aiReviewCompleted && (
 <span
 className="px-2 py-1 text-xs bg-[rgba(255,204,0,0.12)] text-macos-orange rounded"
 title="Ожидает AI проверки"
 >
 <AlertTriangle className="h-3 w-3 inline-block mr-1"/>
 AI
 </span>
 )}
 {expandedSubmission === submission.id ? (
 <ChevronUp className="h-5 w-5 text-tertiary"/>
 ) : (
 <ChevronDown className="h-5 w-5 text-tertiary"/>
 )}
 </div>
 </div>

 {/* Детали прохождения */}
 {expandedSubmission === submission.id && selectedSubmission && (
 <div className="border-t bg-fill-quaternary p-4">
 <h3 className="font-medium text-primary mb-4">Ответы студента</h3>
 <div className="space-y-4">
 {selectedSubmission.answers?.map((answer, i) => (
 <AnswerCard
 key={answer.id}
 answer={answer}
 index={i}
 onGrade={handleGrade}
 />
 ))}
 </div>
 </div>
 )}
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 );
}

// Компонент карточки ответа
function AnswerCard({
 answer,
 index,
 onGrade,
}: {
 answer: ExamAnswer;
 index: number;
 onGrade: (answerId: string, score: number, feedback?: string) => void;
}) {
 const [editing, setEditing] = useState(false);
 const [score, setScore] = useState(answer.score ?? answer.aiScore ?? 0);
 const [feedback, setFeedback] = useState(answer.manualFeedback || answer.aiFeedback ||"");

 const needsReview = !answer.aiChecked && !answer.manualChecked && 
 ["TEXT_LONG","PROBLEM"].includes(answer.question?.type ||"");

 return (
 <div className="bg-white rounded-lg border p-4">
 <div className="flex items-start gap-3">
 <span
 className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-[11px] font-medium uppercase tracking-widest ${
 answer.isCorrect === true
 ?"bg-[rgba(52,199,89,0.12)] text-macos-green"
 : answer.isCorrect === false
 ?"bg-[rgba(255,59,48,0.12)] text-macos-red"
 :"bg-[rgba(255,204,0,0.12)] text-macos-orange"
}`}
 >
 {index + 1}
 </span>
 <div className="flex-1">
 <p className="text-primary font-medium mb-2">{answer.question?.content}</p>
 <div className="bg-fill-quaternary rounded p-2 mb-2">
 <p className="text-sm text-secondary">Ответ студента:</p>
 <p className="text-primary">{answer.answer ||"—"}</p>
 </div>

 {/* AI/Ручная оценка */}
 <div className="flex items-center gap-4 text-sm">
 <div>
 <span className="text-secondary">Баллы: </span>
 <span className="font-semibold">
 {answer.score ?? 0}/{answer.maxScore}
 </span>
 </div>
 {answer.aiChecked && (
 <span className="px-2 py-0.5 bg-[rgba(0,122,255,0.12)] text-macos-blue rounded text-xs">
 AI: {answer.aiScore}
 </span>
 )}
 {answer.manualChecked && (
 <span className="px-2 py-0.5 bg-[rgba(175,82,222,0.12)] text-[var(--color-purple)] rounded text-xs">
 Ручная оценка
 </span>
 )}
 </div>

 {/* Отзыв */}
 {(answer.aiFeedback || answer.manualFeedback) && !editing && (
 <div className="mt-2 text-sm text-secondary bg-fill-quaternary p-2 rounded">
 💬 {answer.manualFeedback || answer.aiFeedback}
 </div>
 )}

 {/* Кнопка редактирования */}
 {needsReview && !editing && (
 <div className="mt-3">
 <button
 onClick={() => setEditing(true)}
 className="flex items-center gap-1 text-sm text-macos-blue hover:text-macos-blue"
 >
 <Edit className="h-4 w-4"/>
 Оценить вручную
 </button>
 </div>
 )}

 {/* Форма ручной оценки */}
 {editing && (
 <div className="mt-3 space-y-3 p-3 bg-fill-quaternary rounded-lg">
 <div className="flex items-center gap-4">
 <label className="text-sm text-primary">Баллы:</label>
 <input
 type="number"
 value={score}
 onChange={(e) => setScore(Number(e.target.value))}
 min={0}
 max={answer.maxScore}
 className="w-20 px-2 py-1 border rounded focus-visible:ring-4 focus-visible:ring-macos-blue/30"
 />
 <span className="text-sm text-secondary">/ {answer.maxScore}</span>
 </div>
 <div>
 <label className="block text-sm text-primary mb-1">Комментарий:</label>
 <textarea
 value={feedback}
 onChange={(e) => setFeedback(e.target.value)}
 rows={2}
 className="w-full px-3 py-2 border rounded focus-visible:ring-4 focus-visible:ring-macos-blue/30"
 placeholder="Комментарий к оценке..."
 />
 </div>
 <div className="flex gap-2">
 <button
 onClick={() => {
 onGrade(answer.id, score, feedback);
 setEditing(false);
}}
 className="px-3 py-1.5 bg-macos-blue text-white rounded text-sm hover:bg-macos-blue"
 >
 Сохранить
 </button>
 <button
 onClick={() => setEditing(false)}
 className="px-3 py-1.5 bg-fill-secondary text-primary rounded text-sm hover:bg-gray-300"
 >
 Отмена
 </button>
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 );
}
