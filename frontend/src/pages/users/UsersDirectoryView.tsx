import { useEffect, useMemo, useState} from 'react';
import { Edit, RotateCcw, Search, Trash2, UserPlus} from 'lucide-react';
import { toast} from 'sonner';
import { useApi} from '../../hooks/useApi';
import { DataTable, Column} from '../../components/DataTable/DataTable';
import { Card} from '../../components/Card';
import { Button} from '../../components/ui/button';
import { Input} from '../../components/ui/input';
import { Modal} from '../../components/Modal';
import { UserForm} from '../../components/forms/UserForm';
import type { User} from '../../types/user';
import { api} from '../../lib/api';
import { ROLE_COLORS, ROLE_LABELS} from '../../lib/roles';

const STATUS_LABELS: Record<User['status'], string> = {
 ACTIVE: 'Активен',
 INACTIVE: 'Деактивирован',
};

const STATUS_COLORS: Record<User['status'], string> = {
 ACTIVE: 'bg-emerald-100 text-emerald-700',
 INACTIVE: 'bg-slate-200 text-slate-700',
};

export function UsersDirectoryView() {
 const { data, total, page, setPage, fetchData, loading, setFilters} = useApi<User>({
 url: '/api/users',
 filters: { status: 'ACTIVE'},
 sortBy: 'createdAt',
 sortOrder: 'desc',
});

 const [search, setSearch] = useState('');
 const [roleFilter, setRoleFilter] = useState<string>('');
 const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE' | 'ALL'>('ACTIVE');
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [editingUser, setEditingUser] = useState<User | null>(null);
 const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
 const [restoringId, setRestoringId] = useState<number | null>(null);
 const [isDeleting, setIsDeleting] = useState(false);

 useEffect(() => {
 setPage(1);
 setFilters({
 search: search.trim() || undefined,
 role: roleFilter || undefined,
 status: statusFilter,
});
}, [search, roleFilter, statusFilter, setFilters, setPage]);

 const counts = useMemo(() => {
 const active = data.filter((user) => user.status === 'ACTIVE').length;
 const inactive = data.filter((user) => user.status === 'INACTIVE').length;
 return { active, inactive};
}, [data]);

 const columns: Column<User>[] = [
 { key: 'id', header: 'ID'},
 { key: 'email', header: 'Логин'},
 {
 key: 'role',
 header: 'Роль',
 render: (row) => (
 <span className={`px-2 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[row.role]}`}>
 {ROLE_LABELS[row.role]}
 </span>
 ),
},
 {
 key: 'status',
 header: 'Статус',
 render: (row) => (
 <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[row.status]}`}>
 {STATUS_LABELS[row.status]}
 </span>
 ),
},
 {
 key: 'employee',
 header: 'Сотрудник',
 render: (row) => row.employee ? `${row.employee.lastName} ${row.employee.firstName}`: '—',
},
 {
 key: 'position',
 header: 'Должность',
 render: (row) => row.employee?.position || '—',
},
 {
 key: 'actions',
 header: 'Действия',
 render: (row) => (
 <div className="flex flex-wrap gap-2">
 <Button variant="outline"size="sm"onClick={() => { setEditingUser(row); setIsModalOpen(true);}}>
 <Edit className="h-4 w-4"/>
 </Button>
 {row.status === 'ACTIVE' ? (
 <Button variant="destructive"size="sm"onClick={() => setDeleteTarget(row)}>
 <Trash2 className="h-4 w-4"/>
 </Button>
 ) : (
 <Button variant="secondary"size="sm"onClick={() => handleRestore(row)} disabled={restoringId === row.id}>
 <RotateCcw className="h-4 w-4"/>
 </Button>
 )}
 </div>
 ),
},
 ];

 const handleRestore = async (user: User) => {
 setRestoringId(user.id);
 try {
 await api.post(`/api/users/${user.id}/restore`);
 toast.success('Учётная запись восстановлена');
 await fetchData();
} catch (error: any) {
 toast.error('Не удалось восстановить пользователя', { description: error?.message});
} finally {
 setRestoringId(null);
}
};

 const handleDeactivate = async () => {
 if (!deleteTarget) return;
 setIsDeleting(true);
 try {
 await api.delete(`/api/users/${deleteTarget.id}`);
 toast.success('Учётная запись деактивирована');
 setDeleteTarget(null);
 await fetchData();
} catch (error: any) {
 toast.error('Не удалось деактивировать пользователя', { description: error?.message});
} finally {
 setIsDeleting(false);
}
};

 return (
 <div className="space-y-6">
 <Card className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-macos-blue uppercase tracking-widest">Пользователи ERP</p>
          <h2 className="text-xl font-semibold">Учётные записи сотрудников</h2>
          <p className="text-sm text-secondary">Управляйте жизненным циклом учётных записей, не теряя историю действий и привязку к сотруднику.</p>
        </div>
 <Button onClick={() => { setEditingUser(null); setIsModalOpen(true);}}>
 <UserPlus className="mr-2 h-4 w-4"/> Добавить пользователя
 </Button>
 </div>
 </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4"><p className="text-sm text-secondary">На странице</p><p className="mt-1 text-2xl font-semibold">{data.length}</p></Card>
        <Card className="p-4"><p className="text-sm text-secondary">Активные</p><p className="mt-1 text-2xl font-semibold">{counts.active}</p></Card>
        <Card className="p-4"><p className="text-sm text-secondary">Деактивированные</p><p className="mt-1 text-2xl font-semibold">{counts.inactive}</p></Card>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_220px_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tertiary" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск по логину, ФИО или должности" className="pl-10" />
          </div>
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="w-full rounded-md border border-field px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-macos-blue focus:border-macos-blue bg-surface-primary">
            <option value="">Все роли</option>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'ACTIVE' | 'INACTIVE' | 'ALL')} className="w-full rounded-md border border-field px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-macos-blue focus:border-macos-blue bg-surface-primary">
            <option value="ACTIVE">Только активные</option>
            <option value="INACTIVE">Только деактивированные</option>
            <option value="ALL">Все статусы</option>
          </select>
        </div>
      </Card>

      {loading && <div className="text-sm text-secondary">Загрузка пользователей...</div>}

 <DataTable columns={columns} data={data} page={page} pageSize={10} total={total} onPageChange={setPage} />

 <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingUser ? 'Редактировать пользователя' : 'Добавить пользователя'}>
 <UserForm
 initialData={editingUser}
 onSuccess={async () => {
 setIsModalOpen(false);
 await fetchData();
 toast.success(editingUser ? 'Пользователь обновлён' : 'Пользователь создан');
}}
 onCancel={() => setIsModalOpen(false)}
 />
 </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Деактивировать пользователя?">
        <div className="space-y-4">
          <p className="text-secondary">Учётная запись <span className="font-semibold">{deleteTarget?.email}</span> будет отключена, но история действий и связь с сотрудником сохранятся.</p>
          {deleteTarget?.employee && (
            <div className="rounded-lg bg-fill-quaternary p-3 text-sm text-secondary">
              {deleteTarget.employee.lastName} {deleteTarget.employee.firstName} — {deleteTarget.employee.position}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>Отмена</Button>
            <Button variant="destructive" onClick={handleDeactivate} disabled={isDeleting}>{isDeleting ? 'Деактивация...' : 'Деактивировать'}</Button>
          </div>
        </div>
      </Modal>
 </div>
 );
}