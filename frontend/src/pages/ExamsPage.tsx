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
import { Skeleton} from"../components/ui/LoadingState";
import { EmptyState} from"../components/ui/EmptyState";
import { MacosAlertDialog} from"../components/MacosAlertDialog";

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
 const [examToDelete, setExamToDelete] = useState<Exam | null>(null);

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
 try {
 await examsApi.deleteExam(examId);
 toast.success("Контрольная удалена");
 fetchExams();
} catch (error) {
 toast.error("Ошибка при удалении");
} finally {
 setExamToDelete(null);
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
 <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Skeleton height={28} width="40%" className="mb-2" />
          <Skeleton height={16} width="55%" />
        </div>
        <Skeleton height={36} width={160} />
      </div>
      <Skeleton height={56} rounded="lg" />
      <div className="grid gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border border-border rounded-xl p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3 mb-2">
                  <Skeleton height={18} width="45%" />
                  <Skeleton height={18} width={80} rounded="full" />
                </div>
                <Skeleton height={14} width="70%" />
                <div className="flex gap-4 mt-2">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <Skeleton key={j} height={12} width={80} />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Skeleton height={32} width={120} rounded="md" />
                <Skeleton height={32} width={100} rounded="md" />
              </div>
            </div>
          </div>
        ))}
      </div>
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
        <div className="bg-card rounded-xl border border-border">
          <EmptyState
            icon={FileText}
            title={searchQuery || statusFilter ? "Ничего не найдено" : "Нет контрольных работ"}
            description={searchQuery || statusFilter ? "Попробуйте изменить параметры поиска" : "Создайте первую контрольную работу для учеников"}
            action={{ label: "Создать контрольную", onClick: () => navigate("/exams/new"), icon: Plus }}
            size="lg"
          />
        </div>
 ) : (
        <div className="grid gap-4">
          {filteredExams.map((exam) => (
            <div key={exam.id} className="bg-card border border-border rounded-xl p-6 hover:bg-muted/50 transition-colors duration-200">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Основная информация */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-foreground font-medium tracking-[-0.01em]">{exam.title}</h3>
                    <span className={`mezon-badge ${statusColors[exam.status]}`}>
                      {statusLabels[exam.status]}
                    </span>
                  </div>
                  {exam.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{exam.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
 {exam.subject && (
 <span className="flex items-center gap-1">
 <FileText className="h-3.5 w-3.5"/>
 {exam.subject}
 </span>
 )}
 <span className="flex items-center gap-1 tabular-nums">
 <FileText className="h-3.5 w-3.5"/>
 {exam._count?.questions || 0} вопросов
 </span>
 {exam.timeLimit && (
 <span className="flex items-center gap-1 tabular-nums">
 <Clock className="h-3.5 w-3.5"/>
 {exam.timeLimit} мин
 </span>
 )}
 <span className="flex items-center gap-1 tabular-nums">
 <Users className="h-3.5 w-3.5"/>
 {exam._count?.submissions || 0} прохождений
 </span>
 {exam.startDate && (
 <span className="flex items-center gap-1 tabular-nums">
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
 onClick={() => setExamToDelete(exam)}
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

      <MacosAlertDialog
        isOpen={examToDelete !== null}
        title="Удалить контрольную?"
        description={`Контрольная «${examToDelete?.title}» будет безвозвратно удалена.`}
        onClose={() => setExamToDelete(null)}
        cancelAction={{ label: "Отмена", onClick: () => setExamToDelete(null) }}
        primaryAction={{ label: "Удалить", onClick: () => examToDelete && handleDelete(examToDelete.id) }}
      />
 </div>
 );
}
