import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MessageCircleWarning, ShieldAlert, AlertTriangle, Bug, Inbox, Layers3 } from "lucide-react";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../hooks/useAuth";
import { DataTable, Column } from "../components/DataTable/DataTable";
import { Button } from "../components/ui/button";
import { Modal, ModalActions, ModalNotice, ModalSection } from "../components/Modal";
import { Feedback, FeedbackStatus } from "../types/feedback";
import { FeedbackResponseForm } from "../components/forms/FeedbackResponseForm";
import { BugReportForm } from "../components/forms/BugReportForm";
import { api } from "../lib/api";

const WAITLIST_TYPE = "WAITLIST";
const BUG_REPORT_TYPE = "Баг-репорт";
const MANAGER_ROLES = ["DEVELOPER", "DIRECTOR", "DEPUTY", "ADMIN"];
const DELETE_ROLES = ["DEVELOPER", "DIRECTOR", "ADMIN"];
const MESSAGE_PREVIEW_LENGTH = 120;

const STATUS_OPTIONS = [
  { value: "ALL", label: "Все статусы" },
  { value: "NEW", label: "Новые" },
  { value: "IN_PROGRESS", label: "В работе" },
  { value: "RESOLVED", label: "Решённые" },
] as const;

const TYPE_OPTIONS = [
  { value: WAITLIST_TYPE, label: "Waitlist" },
  { value: BUG_REPORT_TYPE, label: "Баг-репорты" },
  { value: "ALL", label: "Все обращения" },
] as const;

function getStatusLabel(status: FeedbackStatus) {
  return status === "NEW" ? "Новое" : status === "IN_PROGRESS" ? "В работе" : "Решено";
}

function getFeedbackTypeLabel(type: string) {
  return type === WAITLIST_TYPE ? "Waitlist" : type;
}

function getStatusBadge(status: FeedbackStatus) {
  const styles = {
    NEW: "bg-[rgba(0,122,255,0.12)] text-blue-800",
    IN_PROGRESS: "bg-[rgba(255,204,0,0.12)] text-yellow-800",
    RESOLVED: "bg-[rgba(52,199,89,0.12)] text-green-800",
  };

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${styles[status]}`}>
      {getStatusLabel(status)}
    </span>
  );
}

export default function FeedbackPage() {
  const { user } = useAuth();
  const canManageFeedback = MANAGER_ROLES.includes(user?.role || "");
  const canDeleteFeedback = DELETE_ROLES.includes(user?.role || "");
  const [typeFilter, setTypeFilter] = useState<string>(WAITLIST_TYPE);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingFeedback, setDeletingFeedback] = useState<Feedback | null>(null);
  const [deleting, setDeleting] = useState(false);

  const activeFilters = useMemo(
    () => ({
      ...(typeFilter !== "ALL" ? { type: typeFilter } : {}),
      ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
    }),
    [statusFilter, typeFilter]
  );

  const { data, total, page, setPage, setFilters, fetchData, loading } = useApi<Feedback>({
    url: "/api/feedback",
    filters: activeFilters,
    enabled: canManageFeedback,
  });

  useEffect(() => {
    if (!canManageFeedback) {
      return;
    }

    setPage(1);
    setFilters(activeFilters);
  }, [activeFilters, canManageFeedback, setFilters, setPage]);

  const handleOpenFeedback = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setIsResponseModalOpen(true);
  };

  const openDeleteModal = (feedback: Feedback) => {
    setDeletingFeedback(feedback);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingFeedback) return;

    setDeleting(true);
    try {
      await api.delete(`/api/feedback/${deletingFeedback.id}`);
      toast.success("Обращение удалено");
      setDeleteModalOpen(false);
      setDeletingFeedback(null);
      fetchData();
    } catch (error: any) {
      toast.error("Ошибка удаления", { description: error?.message });
    } finally {
      setDeleting(false);
    }
  };

  const handleFormSuccess = () => {
    setIsResponseModalOpen(false);
    if (canManageFeedback) {
      fetchData();
    }
    toast.success("Изменения сохранены");
  };

  const handleBugReportSuccess = () => {
    if (canManageFeedback) {
      fetchData();
    }
  };

  const statusSummary = useMemo(
    () =>
      STATUS_OPTIONS.slice(1).map((option) => ({
        key: option.value,
        label: option.label,
        count: data.filter((item) => item.status === option.value).length,
      })),
    [data]
  );

  const columns: Column<Feedback>[] = useMemo(
    () => [
      { key: "id", header: "ID" },
      {
        key: "status",
        header: "Статус",
        render: (row) => getStatusBadge(row.status),
      },
      {
        key: "type",
        header: "Тип",
        render: (row) => getFeedbackTypeLabel(row.type),
      },
      { key: "parentName", header: "Школа / автор" },
      { key: "contactInfo", header: "Контакты" },
      {
        key: "message",
        header: "Описание",
        render: (row) =>
          row.message.substring(0, MESSAGE_PREVIEW_LENGTH) +
          (row.message.length > MESSAGE_PREVIEW_LENGTH ? "..." : ""),
      },
      {
        key: "createdAt",
        header: "Создано",
        render: (row) => new Date(row.createdAt).toLocaleString("ru-RU"),
      },
      {
        key: "actions",
        header: "Действия",
        render: (row) => (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => handleOpenFeedback(row)}>
              Открыть
            </Button>
            {canDeleteFeedback ? (
              <Button variant="destructive" size="sm" onClick={() => openDeleteModal(row)}>
                Удалить
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [canDeleteFeedback]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Layers3 className="h-7 w-7 text-macos-blue" />
          Заявки и баг-репорты
        </h1>
        <p className="max-w-3xl text-secondary">
          Waitlist-заявки с лендинга попадают сюда автоматически, а внутренние баг-репорты по-прежнему
          можно отправлять из ERP. Для администраторов это единый журнал с полным управлением обращениями.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-start gap-3">
            <div className="rounded-xl bg-rose-50 p-3 text-rose-600">
              <Bug className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Новый баг-репорт</h2>
              <p className="text-sm text-secondary">
                Чем точнее сценарий и ожидаемое поведение, тем быстрее получится воспроизвести и
                исправить проблему.
              </p>
            </div>
          </div>

          <BugReportForm onSuccess={handleBugReportSuccess} />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-700" />
              <div>
                <h3 className="font-semibold text-amber-950">Что получает администратор</h3>
                <p className="mt-1 text-sm text-amber-900">
                  Полный текст waitlist-заявки, контакт, статус обработки и историю ответа прямо в ERP.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900">Telegram и журнал</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li>Новые waitlist-заявки сразу уходят в Telegram администратору.</li>
              <li>В журнале можно открыть, ответить, перевести в работу и закрыть заявку.</li>
              <li>Баг-репорты и заявки хранятся в одном административном центре.</li>
            </ul>
          </div>
        </div>
      </div>

      {canManageFeedback ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-4 rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-semibold">
                  <Inbox className="h-5 w-5 text-macos-blue" />
                  Админ-панель обращений
                </h2>
                <p className="text-sm text-secondary">
                  Отслеживайте новые заявки, берите их в работу и закрывайте после ответа.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium text-text-primary">
                  <span className="mb-1 block text-xs uppercase tracking-[0.12em] text-text-tertiary">
                    Тип
                  </span>
                  <select
                    value={typeFilter}
                    onChange={(event) => setTypeFilter(event.target.value)}
                    className="w-full rounded-2xl border border-card bg-surface-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-macos-blue focus:ring-2 focus:ring-[rgba(0,122,255,0.12)]"
                  >
                    {TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium text-text-primary">
                  <span className="mb-1 block text-xs uppercase tracking-[0.12em] text-text-tertiary">
                    Статус
                  </span>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="w-full rounded-2xl border border-card bg-surface-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-macos-blue focus:ring-2 focus:ring-[rgba(0,122,255,0.12)]"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {statusSummary.map((item) => (
                <div
                  key={item.key}
                  className="rounded-2xl border border-card bg-[rgba(246,247,251,0.8)] px-4 py-4"
                >
                  <p className="text-xs uppercase tracking-[0.16em] text-text-tertiary">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-text-primary">{item.count}</p>
                </div>
              ))}
            </div>
          </div>

          <DataTable
            columns={columns}
            data={data}
            page={page}
            pageSize={10}
            total={total}
            onPageChange={setPage}
            wrapCells
          />

          {loading ? <p className="text-sm text-text-tertiary">Обновляем журнал...</p> : null}
        </div>
      ) : null}

      <Modal
        isOpen={isResponseModalOpen}
        onClose={() => setIsResponseModalOpen(false)}
        title={selectedFeedback?.type === WAITLIST_TYPE ? "Обработка waitlist-заявки" : "Ответ на обращение"}
        eyebrow="Административный разбор"
        description="Проверьте исходную заявку, зафиксируйте ответ и сохраните актуальный статус."
        icon={<MessageCircleWarning className="h-5 w-5" />}
        size="xl"
        meta={selectedFeedback ? getStatusBadge(selectedFeedback.status) : null}
      >
        {selectedFeedback ? (
          <FeedbackResponseForm
            feedback={selectedFeedback}
            onSuccess={handleFormSuccess}
            onCancel={() => setIsResponseModalOpen(false)}
          />
        ) : null}
      </Modal>

      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Удаление обращения"
        eyebrow="Опасное действие"
        description="Обращение исчезнет из журнала навсегда. Перед удалением проверьте карточку заявки."
        icon={<AlertTriangle className="h-5 w-5" />}
        tone="danger"
        closeOnBackdrop={!deleting}
        closeOnEscape={!deleting}
        footer={
          <ModalActions>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)} disabled={deleting}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Удаление..." : "Удалить"}
            </Button>
          </ModalActions>
        }
      >
        <ModalNotice title="Удаление необратимо" tone="danger">
          После подтверждения запись, статус и ответ будут удалены из административного журнала.
        </ModalNotice>

        {deletingFeedback ? (
          <ModalSection title="Карточка обращения" description="Сверьте данные, чтобы не удалить не ту заявку.">
            <div className="mezon-modal-facts">
              <div className="mezon-modal-fact">
                <span className="mezon-modal-fact__label">Школа / автор</span>
                <span className="mezon-modal-fact__value">{deletingFeedback.parentName}</span>
              </div>
              <div className="mezon-modal-fact">
                <span className="mezon-modal-fact__label">Тип</span>
                <span className="mezon-modal-fact__value">{getFeedbackTypeLabel(deletingFeedback.type)}</span>
              </div>
              <div className="mezon-modal-fact">
                <span className="mezon-modal-fact__label">Контакты</span>
                <span className="mezon-modal-fact__value">{deletingFeedback.contactInfo}</span>
              </div>
              <div className="mezon-modal-fact">
                <span className="mezon-modal-fact__label">Статус</span>
                <span className="mezon-modal-fact__value">{getStatusLabel(deletingFeedback.status)}</span>
              </div>
            </div>

            <ModalNotice title="Фрагмент сообщения" tone="warning">
              {deletingFeedback.message.substring(0, 200)}
              {deletingFeedback.message.length > 200 ? "..." : ""}
            </ModalNotice>
          </ModalSection>
        ) : null}
      </Modal>
    </div>
  );
}
