import { useState } from 'react';
import { toast } from 'sonner';
import { useApi } from '../hooks/useApi';
import { DataTable, Column } from '../components/DataTable/DataTable';
import { Button } from '../components/ui/button';
import { Modal } from '../components/Modal';
import { PlusCircle, CalendarDays, Trash2, AlertTriangle, LayoutGrid, List } from 'lucide-react';
import { Event } from '../types/calendar';
import { EventForm } from '../components/forms/EventForm';
import { api } from '../lib/api';
import { CalendarGrid } from '../components/CalendarGrid';

type ViewMode = 'calendar' | 'list';

export default function CalendarPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const { data, total, page, setPage, fetchData } = useApi<Event>({
    url: '/api/calendar',
    initialPageSize: 100,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Event | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleCreate = () => {
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  const handleFormSuccess = () => {
    setIsModalOpen(false);
    fetchData();
    toast.success(editingEvent ? 'Событие обновлено' : 'Событие создано');
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      await api.delete(`/api/calendar/${deleteConfirm.id}`);
      toast.success('Событие удалено');
      setDeleteConfirm(null);
      fetchData();
    } catch (error: any) {
      toast.error('Ошибка удаления', { description: error?.message });
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Table columns ──────────────────────────────────────────────────────────

  const columns: Column<Event>[] = [
    { key: 'id', header: 'ID' },
    { key: 'title', header: 'Тема' },
    {
      key: 'date',
      header: 'Дата',
      render: (row) =>
        new Date(row.date).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }),
    },
    {
      key: 'group',
      header: 'Класс',
      render: (row) => row.group?.name ?? '—',
    },
    { key: 'organizer', header: 'Организатор' },
    {
      key: 'performers',
      header: 'Исполнители',
      render: (row) => (row.performers?.length > 0 ? row.performers.join(', ') : '—'),
    },
    {
      key: 'actions',
      header: 'Действия',
      render: (row) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleEdit(row)}>
            Редактировать
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteConfirm(row)}
            className="text-macos-red hover:text-macos-red hover:bg-[rgba(255,59,48,0.06)]"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[24px] font-bold tracking-[-0.025em] leading-tight flex items-center gap-2">
          <CalendarDays className="h-6 w-6" />
          Календарь событий
        </h1>

        <div className="flex items-center gap-3">
          {/* View mode switcher */}
          <div className="flex bg-fill-tertiary p-1 rounded-lg">
            <button
              onClick={() => setViewMode('calendar')}
              aria-label="Вид: Календарь"
              title="Календарь"
              className={`p-2 rounded-md macos-transition ${
                viewMode === 'calendar'
                  ? 'bg-white shadow text-macos-blue'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              aria-label="Вид: Список"
              title="Список"
              className={`p-2 rounded-md macos-transition ${
                viewMode === 'list'
                  ? 'bg-white shadow text-macos-blue'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <Button onClick={handleCreate}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Добавить событие
          </Button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'calendar' ? (
        <CalendarGrid
          events={data}
          onEdit={handleEdit}
          onDelete={(event) => setDeleteConfirm(event)}
        />
      ) : (
        <DataTable
          columns={columns}
          data={data}
          page={page}
          pageSize={10}
          total={total}
          onPageChange={setPage}
          wrapCells
        />
      )}

      {/* ── Create / Edit modal ──────────────────────────────────────────── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEvent ? 'Редактировать событие' : 'Новое событие'}
        eyebrow="Событие"
      >
        <EventForm
          initialData={editingEvent}
          onSuccess={handleFormSuccess}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>

      {/* ── Delete confirmation modal ────────────────────────────────────── */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Удалить событие?"
        eyebrow="Подтверждение"
        tone="danger"
        icon={<AlertTriangle className="h-5 w-5" />}
      >
        <div className="space-y-4">
          <p className="text-[15px]" style={{ color: 'var(--text-primary)' }}>
            Вы уверены, что хотите удалить это событие? Это действие нельзя отменить.
          </p>

          {deleteConfirm && (
            <div
              className="p-3 rounded-xl"
              style={{
                background: 'var(--fill-quaternary)',
                border: '0.5px solid var(--separator)',
              }}
            >
              <p
                className="text-[13px] font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                {deleteConfirm.title}
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {new Date(deleteConfirm.date).toLocaleDateString('ru-RU', { dateStyle: 'long' })}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              disabled={isDeleting}
            >
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Удаление…' : 'Удалить'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
