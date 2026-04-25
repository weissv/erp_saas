// src/pages/ChildrenPage.tsx
// Список детей с фильтрами, поиском и действиями
import React, { useState} from 'react';
import { useNavigate} from 'react-router-dom';
import {
 PlusCircle,
 Search,
 Download,
 UploadCloud,
 Trash2,
 AlertCircle,
 Eye,
 Archive,
 Filter,
 X,
 Users,
} from 'lucide-react';
import { DataTable, Column} from '../components/DataTable/DataTable';
import { Button} from '../components/ui/button';
import { Input, inputBaseClassName } from '../components/ui/input';
import { Modal, ModalActions, ModalNotice, ModalSection} from '../components/Modal';
import { Card} from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ChildForm} from '../components/forms/ChildForm';
import { useChildren, useChildMutations, useGroups} from '../hooks/useChildren';
import { api} from '../lib/api';
import { cn } from '../lib/utils';
import { toast} from 'sonner';
import type { Child, ChildFilters, Gender} from '../types/child';

const selectClassName = cn(inputBaseClassName, 'appearance-none');

const genderLabel = (g?: Gender | null) => {
 if (g === 'MALE') return 'М';
 if (g === 'FEMALE') return 'Ж';
 return '—';
};

const statusLabel = (s: string) => {
 switch (s) {
 case 'ACTIVE': return 'Активен';
 case 'LEFT': return 'Выбыл';
 case 'ARCHIVED': return 'Архив';
 default: return s;
}
};

const statusBadge = (s: string) => {
 const colors: Record<string, string> = {
  ACTIVE: 'success',
  LEFT: 'warning',
  ARCHIVED: 'neutral',
 };
  return (
    <Badge variant={(colors[s] as "success" | "warning" | "neutral") ?? 'neutral'}>{statusLabel(s)}</Badge>
  );
 };

export default function ChildrenPage() {
 const {
 data,
 total,
 page,
 filters,
 loading,
 setPage,
 setFilters,
 refresh,
} = useChildren({ sortBy: 'lastName'});
 const { archiveChild, deleteChild, saving} = useChildMutations();
 const { groups} = useGroups();
 const navigate = useNavigate();

 const [isModalOpen, setIsModalOpen] = useState(false);
 const [editingChild, setEditingChild] = useState<Child | null>(null);
 const [deleteConfirm, setDeleteConfirm] = useState<Child | null>(null);
 const [isDeleting, setIsDeleting] = useState(false);
 const [isExporting, setIsExporting] = useState(false);
 const [showFilters, setShowFilters] = useState(false);

 // --- Search handler ---
 const [searchInput, setSearchInput] = useState(filters.search ?? '');

 React.useEffect(() => {
 const timer = setTimeout(() => {
 setFilters((prev: ChildFilters) => ({ ...prev, search: searchInput || undefined}));
 setPage(1);
}, 350);
 return () => clearTimeout(timer);
}, [searchInput]);

 // --- Handlers ---
 const handleCreate = () => { setEditingChild(null); setIsModalOpen(true);};
 const handleEdit = (child: Child) => { setEditingChild(child); setIsModalOpen(true);};
 const handleFormSuccess = () => {
 setIsModalOpen(false);
 refresh();
};

 const handleExport = async () => {
 setIsExporting(true);
 try {
 const blob = await api.download('/api/integration/export/excel/children');
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = `children-export-${new Date().toISOString().split('T')[0]}.xlsx`;
 a.click();
 URL.revokeObjectURL(url);
 toast.success('Шаблон с детьми выгружен');
} catch (err: any) {
 toast.error('Не удалось скачать шаблон', { description: err?.message});
} finally {
 setIsExporting(false);
}
};

 const handleDelete = async () => {
 if (!deleteConfirm) return;
 setIsDeleting(true);
 try {
 await deleteChild(deleteConfirm.id);
 setDeleteConfirm(null);
 refresh();
} catch {
 // toast from hook
} finally {
 setIsDeleting(false);
}
};

 const handleArchive = async (child: Child) => {
 await archiveChild(child.id);
 refresh();
};

 const hasActiveFilters = !!(filters.status || filters.groupId || filters.gender);

 const clearFilters = () => {
 setFilters({});
 setSearchInput('');
};

 // --- Columns ---
 const columns: Column<Child>[] = [
 { key: 'id', header: '№'},
 {
 key: 'fullName',
 header: 'ФИО',
 render: (row) => (
 <button
 className="text-left text-macos-blue hover:underline font-medium"
 onClick={() => navigate(`/children/${row.id}`)}
 >
 {row.lastName} {row.firstName} {row.middleName || ''}
 </button>
 ),
},
 { key: 'group', header: 'Класс', render: (row) => row.group.name},
 {
 key: 'birthDate',
 header: 'Дата рожд.',
 render: (row) => new Date(row.birthDate).toLocaleDateString('ru-RU'),
},
 { key: 'gender', header: 'Пол', render: (row) => genderLabel(row.gender)},
 {
 key: 'parents',
 header: 'Родители',
 render: (row) => {
 if (row.parents?.length) {
 return (
 <div className="text-sm">
 {row.parents.map((p) => (
 <div key={p.id}>
 {p.fullName}{p.phone ? `(${p.phone})`: ''}
 </div>
 ))}
 </div>
 );
}
 // Fallback to legacy
 return row.parentPhone || '—';
},
},
 { key: 'status', header: 'Статус', render: (row) => statusBadge(row.status)},
 {
 key: 'actions',
 header: '',
 render: (row) => (
 <div className="flex gap-1">
 <Button variant="ghost"size="sm"onClick={() => navigate(`/children/${row.id}`)} title="Профиль">
 <Eye className="h-4 w-4"/>
 </Button>
 <Button variant="ghost"size="sm"onClick={() => handleEdit(row)} title="Редактировать">
 <PlusCircle className="h-4 w-4"/>
 </Button>
 {row.status === 'ACTIVE' && (
 <Button variant="ghost"size="sm"onClick={() => handleArchive(row)} disabled={saving} title="В архив">
 <Archive className="h-4 w-4"/>
 </Button>
 )}
 <Button variant="ghost"size="sm"className="text-macos-red"onClick={() => setDeleteConfirm(row)} title="Удалить">
 <Trash2 className="h-4 w-4"/>
 </Button>
 </div>
 ),
},
 ];

 return (
  <div className="space-y-4">
  <Card className="border-border/70 bg-card/90">
  <div className="flex flex-col gap-4 p-6 lg:flex-row lg:items-end lg:justify-between">
  <div className="space-y-3">
  <Badge variant="neutral">Student directory</Badge>
  <div className="flex items-start gap-4">
  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
  <Users className="h-5 w-5"/>
  </div>
  <div>
  <h1 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">Управление контингентом детей</h1>
  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Профили учеников, статусы, родители и массовый импорт в одном рабочем пространстве.</p>
  </div>
  </div>
  </div>
  <div className="grid gap-3 sm:grid-cols-3">
  <div className="rounded-xl border border-border bg-background px-4 py-3">
  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Профилей</p>
  <p className="mt-2 text-sm font-medium text-foreground">{total}</p>
  </div>
  <div className="rounded-xl border border-border bg-background px-4 py-3">
  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Страница</p>
  <p className="mt-2 text-sm font-medium text-foreground">{page}</p>
  </div>
  <div className="rounded-xl border border-border bg-background px-4 py-3">
  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Фильтры</p>
  <p className="mt-2 text-sm font-medium text-foreground">{hasActiveFilters ? 'Активны' : 'Не заданы'}</p>
  </div>
  </div>
  </div>
  </Card>

  {/* Import/Export Card */}
  <Card className="flex flex-col gap-3 border-border/70 p-6 sm:flex-row sm:items-center sm:justify-between">
  <div>
  <p className="text-sm font-semibold tracking-[-0.01em] text-foreground">Массовая загрузка списков</p>
  <p className="mt-1 text-sm leading-6 text-muted-foreground">Импортируйте детей из Excel/Google Sheets или выгрузите актуальный шаблон.</p>
  </div>
  <div className="flex flex-col gap-2 sm:flex-row">
  <Button variant="outline"onClick={handleExport} disabled={isExporting}>
 <Download className="mr-2 h-4 w-4"/> {isExporting ? 'Готовим...' : 'Шаблон Excel'}
 </Button>
 <Button onClick={() => navigate('/integration#children')}>
 <UploadCloud className="mr-2 h-4 w-4"/> Перейти к импорту
 </Button>
 </div>
 </Card>

  {/* Search + Filters + Add */}
  <Card className="border-border/70 p-4">
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  <div className="flex items-center gap-2 flex-1">
  <div className="relative flex-1 max-w-sm">
  <Search className="text-muted-foreground absolute left-3 top-3 h-4 w-4"/>
  <Input
  placeholder="Поиск по ФИО..."
  className="pl-9"
  value={searchInput}
  onChange={(e) => setSearchInput(e.target.value)}
  />
 </div>
 <Button
 variant={showFilters ? 'default' : 'outline'}
  size="sm"
  onClick={() => setShowFilters(!showFilters)}
  >
  <Filter className="h-4 w-4 mr-1"/> Фильтры
  {hasActiveFilters && <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">!</span>}
  </Button>
 {hasActiveFilters && (
 <Button variant="ghost"size="sm"onClick={clearFilters}>
 <X className="h-4 w-4 mr-1"/> Сбросить
 </Button>
 )}
 </div>
  <Button onClick={handleCreate} className="w-full sm:w-auto">
  <PlusCircle className="mr-2 h-4 w-4"/> Добавить ребенка
  </Button>
  </div>
  </Card>

  {/* Filters panel */}
  {showFilters && (
  <Card className="border-border/70 p-4">
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <div>
 <label className="mb-1 block text-[11px] font-medium uppercase tracking-widest">Статус</label>
 <select
 className={selectClassName}
 value={filters.status ?? ''}
 onChange={(e) => {
 setFilters((prev: ChildFilters) => ({ ...prev, status: (e.target.value as any) || undefined}));
 setPage(1);
}}
 >
 <option value="">Все</option>
 <option value="ACTIVE">Активные</option>
 <option value="LEFT">Выбывшие</option>
 <option value="ARCHIVED">Архив</option>
 </select>
 </div>
 <div>
 <label className="mb-1 block text-[11px] font-medium uppercase tracking-widest">Класс</label>
 <select
 className={selectClassName}
 value={filters.groupId ?? ''}
 onChange={(e) => {
 setFilters((prev: ChildFilters) => ({ ...prev, groupId: e.target.value ? Number(e.target.value) : undefined}));
 setPage(1);
}}
 >
 <option value="">Все классы</option>
 {groups.map((g) => (
 <option key={g.id} value={g.id}>{g.name}</option>
 ))}
 </select>
 </div>
 <div>
 <label className="mb-1 block text-[11px] font-medium uppercase tracking-widest">Пол</label>
 <select
 className={selectClassName}
 value={filters.gender ?? ''}
 onChange={(e) => {
 setFilters((prev: ChildFilters) => ({ ...prev, gender: (e.target.value as Gender) || undefined}));
 setPage(1);
}}
 >
 <option value="">Все</option>
 <option value="MALE">Мужской</option>
 <option value="FEMALE">Женский</option>
 </select>
 </div>
 </div>
 </Card>
 )}

 {/* Table */}
  <DataTable
  title="Список учеников"
  description="Компактный реестр по классам, статусам, родителям и персональным карточкам."
  columns={columns}
  data={data}
  page={page}
  pageSize={10}
  total={total}
  onPageChange={setPage}
  wrapCells={true}
  emptyTitle="Ученики не найдены"
  emptyDescription="Попробуйте изменить фильтры или добавьте новый профиль."
  emptyAction={handleCreate}
  />

 {/* Create/Edit Modal */}
 <Modal
 isOpen={isModalOpen}
 onClose={() => setIsModalOpen(false)}
 title={editingChild ? 'Редактировать данные' : 'Добавить нового ребенка'}
 eyebrow="Контингент"
 description="Форма собрана по блокам, чтобы администратор мог спокойно пройти по персональным данным, родителям, договору и мединформации без лишней прокрутки внутри модалки."
 icon={<Users className="h-5 w-5"/>}
 size="xl"
  meta={editingChild ? <Badge variant="neutral">Редактирование</Badge> : <Badge>Новый профиль</Badge>}
 >
 <ChildForm
 initialData={editingChild}
 onSuccess={handleFormSuccess}
 onCancel={() => setIsModalOpen(false)}
 />
 </Modal>

 {/* Delete Confirmation */}
 <Modal
 isOpen={!!deleteConfirm}
 onClose={() => setDeleteConfirm(null)}
 title="Удаление ученика"
 eyebrow="Опасное действие"
 description="Профиль ребёнка будет удалён вместе со связанными записями. Перед подтверждением проверьте, что удаляется именно нужный ученик."
 icon={<AlertCircle className="h-5 w-5"/>}
 tone="danger"
 closeOnBackdrop={!isDeleting}
 closeOnEscape={!isDeleting}
 footer={
 <ModalActions>
 <Button variant="ghost"onClick={() => setDeleteConfirm(null)} disabled={isDeleting}>Отмена</Button>
 <Button variant="destructive"onClick={handleDelete} disabled={isDeleting}>
 {isDeleting ? 'Удаление...' : 'Удалить'}
 </Button>
 </ModalActions>
 }
 >
 {deleteConfirm ? (
 <>
 <ModalNotice title="Удаление затронет связанные данные" tone="danger">
 Будут удалены посещаемость, отсутствия и записи в кружки, связанные с этим профилем. Это действие нельзя отменить.
 </ModalNotice>

 <ModalSection title="Проверка профиля" description="Убедитесь, что выбрали правильного ученика.">
 <div className="mezon-modal-facts">
 <div className="mezon-modal-fact">
 <span className="mezon-modal-fact__label">Ученик</span>
 <span className="mezon-modal-fact__value">{deleteConfirm.lastName} {deleteConfirm.firstName}</span>
 </div>
 <div className="mezon-modal-fact">
 <span className="mezon-modal-fact__label">Класс</span>
 <span className="mezon-modal-fact__value">{deleteConfirm.group?.name || 'Не указан'}</span>
 </div>
 <div className="mezon-modal-fact">
 <span className="mezon-modal-fact__label">Статус</span>
 <span className="mezon-modal-fact__value">{statusLabel(deleteConfirm.status)}</span>
 </div>
 </div>
 </ModalSection>
 </>
 ) : null}
 </Modal>
 </div>
 );
}
