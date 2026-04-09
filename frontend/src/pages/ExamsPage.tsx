// src/pages/ExamsPage.tsx
// Страница списка контрольных для учителей/админов
import { useState, useEffect} from"react";
import {
 Plus,
 Search,
 FileText,
 Clock,
 Users,
 CheckCircle,
 XCircle,
 Edit,
 Trash2,
 Copy,
 ExternalLink,
 BarChart,
 Play,
 Archive,
} from"lucide-react";
import { examsApi} from"../lib/exams-api";
import { Exam, ExamStatus} from"../types/exam";
import { toast} from"sonner";
import { Link, useNavigate} from"react-router-dom";
import { Button} from"../components/ui/button";

const statusLabels: Record<ExamStatus, string> = {
 DRAFT:"Черновик",
 PUBLISHED:"Опубликовано",
 CLOSED:"Закрыто",
 ARCHIVED:"В архиве",
};

const statusColors: Record<ExamStatus, string> = {
 DRAFT:"macos-badge-neutral",
 PUBLISHED:"macos-badge-success",
 CLOSED:"macos-badge-warning",
 ARCHIVED:"macos-badge-neutral",
};

export default function ExamsPage() {
 const navigate = useNavigate();
 const [exams, setExams] = useState<Exam[]>([]);
 const [loading, setLoading] = useState(true);
 const [searchQuery, setSearchQuery] = useState("");
 const [statusFilter, setStatusFilter] = useState<string>("");

 useEffect(() => {
 fetchExams();
}, [statusFilter]);

 const fetchExams = async () => {
 setLoading(true);
 try {
 const data = await examsApi.getExams({
 status: statusFilter || undefined,
});
 setExams(data);
} catch (error) {
 console.error("Failed to fetch exams:", error);
 toast.error("Не удалось загрузить контрольные");
} finally {
 setLoading(false);
}
};

 const filteredExams = exams.filter((exam) =>
 exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
 (exam.subject ||"").toLowerCase().includes(searchQuery.toLowerCase())
 );

 const handlePublish = async (exam: Exam) => {
 if (!exam._count?.questions || exam._count.questions === 0) {
 toast.error("Добавьте хотя бы один вопрос перед публикацией");
 return;
}
 try {
 await examsApi.publishExam(exam.id);
 toast.success("Контрольная опубликована");
 fetchExams();
} catch (error) {
 toast.error("Ошибка при публикации");
}
};

 const handleClose = async (examId: string) => {
 try {
 await examsApi.closeExam(examId);
 toast.success("Контрольная закрыта");
 fetchExams();
} catch (error) {
 toast.error("Ошибка при закрытии");
}
};

 const handleDelete = async (examId: string) => {
 if (!confirm("Вы уверены, что хотите удалить контрольную?")) return;
 try {
 await examsApi.deleteExam(examId);
 toast.success("Контрольная удалена");
 fetchExams();
} catch (error) {
 toast.error("Ошибка при удалении");
}
};

 const copyPublicLink = (exam: Exam) => {
 const url = exam.publicUrl || `${window.location.origin}/exam/${exam.publicToken}`;
 navigator.clipboard.writeText(url);
 toast.success("Ссылка скопирована в буфер обмена");
};

 const formatDate = (date?: string | null) => {
 if (!date) return"—";
 return new Date(date).toLocaleDateString("ru", {
 day:"numeric",
 month:"short",
 year:"numeric",
});
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
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold tracking-[-0.025em] text-primary leading-tight mt-2">Контрольные работы</h1>
          <p className="text-[15px] font-medium text-secondary leading-relaxed tracking-[-0.01em] mt-1">Создавайте и управляйте контрольными</p>
        </div>
        <Button onClick={() => navigate("/exams/new")}>
          <Plus className="h-5 w-5 mr-1" />
          Создать контрольную
        </Button>
      </div>

      {/* Фильтры */}
      <div className="bg-surface-primary rounded-xl shadow-subtle p-4 border border-card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-tertiary" />
            <input
              type="text"
              placeholder="Поиск по названию или предмету..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 mezon-field"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 mezon-field sm:w-auto"
          >
            <option value="">Все статусы</option>
            <option value="DRAFT">Черновики</option>
            <option value="PUBLISHED">Опубликованные</option>
            <option value="CLOSED">Закрытые</option>
            <option value="ARCHIVED">В архиве</option>
          </select>
        </div>
      </div>

      {/* Список контрольных */}
      {filteredExams.length === 0 ? (
        <div className="bg-surface-primary rounded-xl shadow-subtle p-12 text-center border border-card">
          <FileText className="h-16 w-16 text-tertiary mx-auto mb-4" />
          <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-primary mb-2">Нет контрольных</h3>
          <p className="text-[14px] text-secondary mb-6">Создайте первую контрольную работу</p>
          <Button onClick={() => navigate("/exams/new")}>
            <Plus className="h-5 w-5 mr-1" />
            Создать контрольную
          </Button>
        </div>
 ) : (
        <div className="grid gap-4">
          {filteredExams.map((exam) => (
            <div key={exam.id} className="bg-surface-primary border border-card rounded-xl shadow-subtle p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Основная информация */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-primary">{exam.title}</h3>
                    <span className={`mezon-badge ${statusColors[exam.status]}`}>
                      {statusLabels[exam.status]}
                    </span>
                  </div>
                  {exam.description && (
                    <p className="text-[14px] leading-relaxed text-secondary mb-3 line-clamp-2">{exam.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 text-[11px] font-medium text-tertiary uppercase tracking-widest">
 {exam.subject && (
 <span className="flex items-center gap-1">
 <FileText className="h-4 w-4"/>
 {exam.subject}
 </span>
 )}
 <span className="flex items-center gap-1">
 <FileText className="h-4 w-4"/>
 {exam._count?.questions || 0} вопросов
 </span>
 {exam.timeLimit && (
 <span className="flex items-center gap-1">
 <Clock className="h-4 w-4"/>
 {exam.timeLimit} мин
 </span>
 )}
 <span className="flex items-center gap-1">
 <Users className="h-4 w-4"/>
 {exam._count?.submissions || 0} прохождений
 </span>
 {exam.startDate && (
 <span className="flex items-center gap-1">
 Начало: {formatDate(exam.startDate)}
 </span>
 )}
 </div>
 </div>

 {/* Действия */}
 <div className="flex flex-wrap items-center gap-2">
 <Button
 variant="outline"size="sm"
 onClick={() => navigate(`/exams/${exam.id}/edit`)}
 >
 <Edit className="h-4 w-4 mr-1"/>
 Редактировать
 </Button>

 {exam.status ==="DRAFT"&& (
 <Button
 size="sm"
 onClick={() => handlePublish(exam)}
 >
 <Play className="h-4 w-4 mr-1"/>
 Опубликовать
 </Button>
 )}

 {exam.status ==="PUBLISHED"&& (
 <>
 <Button
 variant="secondary"size="sm"
 onClick={() => copyPublicLink(exam)}
 title="Скопировать ссылку для студентов"
 >
 <Copy className="h-4 w-4 mr-1"/>
 Ссылка
 </Button>
 <a
 href={`/exam/${exam.publicToken}`}
 target="_blank"
 rel="noopener noreferrer"
 >
 <Button variant="outline"size="sm">
 <ExternalLink className="h-4 w-4 mr-1"/>
 Открыть
 </Button>
 </a>
 <Button
 variant="destructive"size="sm"
 onClick={() => handleClose(exam.id)}
 >
 <XCircle className="h-4 w-4 mr-1"/>
 Закрыть
 </Button>
 </>
 )}

 {(exam.status ==="PUBLISHED"|| exam.status ==="CLOSED") && (
 <Button
 variant="secondary"size="sm"
 onClick={() => navigate(`/exams/${exam.id}/results`)}
 >
 <BarChart className="h-4 w-4 mr-1"/>
 Результаты
 </Button>
 )}

 {exam.status ==="DRAFT"&& (
 <Button
 variant="destructive"size="sm"
 onClick={() => handleDelete(exam.id)}
 >
 <Trash2 className="h-4 w-4 mr-1"/>
 Удалить
 </Button>
 )}
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 );
}
