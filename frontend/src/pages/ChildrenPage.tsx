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
import { Input} from '../components/ui/input';
import { Modal, ModalActions, ModalNotice, ModalSection} from '../components/Modal';
import { Card} from '../components/Card';
import { ChildForm} from '../components/forms/ChildForm';
import { useChildren, useChildMutations, useGroups} from '../hooks/useChildren';
import { api} from '../lib/api';
import { toast} from 'sonner';
import type { Child, ChildFilters, Gender} from '../types/child';

const selectClassName = 'mezon-field';

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
 ACTIVE: 'macos-badge-success',
 LEFT: 'macos-badge-warning',
 ARCHIVED: 'macos-badge-neutral',
};
 return (
 <span className={`mezon-badge ${colors[s] ?? 'macos-badge-neutral'}`}>
 {statusLabel(s)}
 </span>
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
 <div>
 <div className="mb-4 flex items-start justify-between gap-4">
 <div className="flex items-center gap-3">
 <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-[rgba(0,122,255,0.08)] text-macos-blue">
 <Users className="h-5 w-5"/>
 </div>
 <div>
 <div className="mezon-badge macos-badge-neutral mb-1">Children · контингент</div>
 <h1 className="text-[24px] font-bold tracking-[-0.025em] leading-tight">Управление контингентом детей</h1>
 <p className="text-[15px] font-medium leading-relaxed tracking-[-0.01em] mt-1">Профили учеников, статусы, родители и массовый импорт в одном рабочем пространстве.</p>
 </div>
 </div>
 </div>

 {/* Import/Export Card */}
 <Card className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shadow-subtle">
 <div>
 <p className="text-[14px] font-semibold tracking-[-0.01em]">Массовая загрузка списков</p>
 <p className="text-[14px] leading-relaxed text-secondary mt-1">Импортируйте детей из Excel/Google Sheets или выгрузите актуальный шаблон.</p>
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
 <div className="mb-4 flex flex-col gap-3 rounded-[18px] border border-card bg-surface-primary p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur-[24px] sm:flex-row sm:items-center sm:justify-between">
 <div className="flex items-center gap-2 flex-1">
 <div className="relative flex-1 max-w-sm">
 <Search className="text-muted-foreground absolute left-2 top-2.5 h-4 w-4"/>
 <Input
 placeholder="Поиск по ФИО..."
 className="pl-8"
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
 {hasActiveFilters && <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-white text-xs text-black">!</span>}
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

 {/* Filters panel */}
 {showFilters && (
 <Card className="mb-4 p-4 shadow-subtle">
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
 columns={columns}
 data={data}
 page={page}
 pageSize={10}
 total={total}
 onPageChange={setPage}
 wrapCells={true}
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
 meta={editingChild ? <span className="mezon-badge macos-badge-neutral">Редактирование</span> : <span className="mezon-badge">Новый профиль</span>}
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
