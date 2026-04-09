import { useState, useEffect} from 'react';
import { toast} from 'sonner';
import { useApi} from '../hooks/useApi';
import { DataTable, Column} from '../components/DataTable/DataTable';
import { Button} from '../components/ui/button';
import { Modal} from '../components/Modal';
import { PlusCircle, AlertCircle, UploadCloud, Download, Trash2} from 'lucide-react';
import { EmployeeForm} from '../components/forms/EmployeeForm';
import { Employee} from '../types/employee';
import { api} from '../lib/api';
import { Card} from '../components/Card';
import { useNavigate} from 'react-router-dom';

export default function EmployeesPage() {
 const { data, total, page, setPage, fetchData} = useApi<Employee>({
 url: '/api/employees',
});
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
 const [reminders, setReminders] = useState<any>(null);
 const [isExporting, setIsExporting] = useState(false);
 const [deleteConfirm, setDeleteConfirm] = useState<Employee | null>(null);
 const [isDeleting, setIsDeleting] = useState(false);
 const navigate = useNavigate();

 useEffect(() => {
 loadReminders();
}, []);

 const loadReminders = async () => {
 try {
 const data = await api.get('/api/employees/reminders');
 setReminders(data);
} catch (error: any) {
 console.error('Failed to load reminders:', error);
}
};

 const handleCreate = () => {
 setEditingEmployee(null);
 setIsModalOpen(true);
};

 const handleEdit = (employee: Employee) => {
 setEditingEmployee(employee);
 setIsModalOpen(true);
};

 const handleFormSuccess = () => {
 setIsModalOpen(false);
 fetchData();
 toast.success(editingEmployee ? 'Данные сотрудника обновлены' : 'Сотрудник успешно добавлен');
};

 const handleDelete = async () => {
 if (!deleteConfirm) return;
 setIsDeleting(true);
 try {
 await api.delete(`/api/employees/${deleteConfirm.id}`);
 toast.success('Сотрудник удалён');
 setDeleteConfirm(null);
 fetchData();
} catch (error: any) {
 toast.error('Ошибка удаления', { description: error?.message});
} finally {
 setIsDeleting(false);
}
};

 const handleEmployeesExport = async () => {
 setIsExporting(true);
 try {
 const blob = await api.download('/api/integration/export/excel/employees');
 const url = URL.createObjectURL(blob);
 const anchor = document.createElement('a');
 anchor.href = url;
 anchor.download = `employees-export-${new Date().toISOString().split('T')[0]}.xlsx`;
 anchor.click();
 URL.revokeObjectURL(url);
 toast.success('Шаблон с сотрудниками выгружен');
} catch (error: any) {
 toast.error('Не удалось скачать шаблон', { description: error?.message});
} finally {
 setIsExporting(false);
}
};

 const columns: Column<Employee>[] = [
 { key: 'id', header: 'ID'},
 { key: 'lastName', header: 'Фамилия'},
 { key: 'firstName', header: 'Имя'},
 { key: 'birthDate', header: 'Дата рождения', render: (row) => row.birthDate ? new Date(row.birthDate).toLocaleDateString('ru-RU') : '—'},
 { key: 'position', header: 'Должность'},
 { key: 'rate', header: 'Ставка'},
 { key: 'user', header: 'Аккаунт', render: (row) => row.user ? <span className="text-macos-green">{row.user.email}</span> : <span className="text-tertiary">Нет</span>},
 {
 key: 'actions',
 header: 'Действия',
 render: (row) => (
 <div className="flex gap-2">
 <Button variant="outline"size="sm"onClick={() => handleEdit(row)}>
 Редактировать
 </Button>
 <Button variant="destructive"size="sm"onClick={() => setDeleteConfirm(row)}>
 <Trash2 className="h-4 w-4"/>
 </Button>
 </div>
 ),
},
 ];

 return (
 <div>
 <h1 className="text-[24px] font-bold tracking-[-0.025em] leading-tight mb-4">Управление сотрудниками</h1>

 <Card className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shadow-subtle">
 <div>
 <p className="text-[14px] font-semibold tracking-[-0.01em]">Быстрый обмен данными HR</p>
 <p className="text-[14px] leading-relaxed text-secondary mt-1">Выгрузите текущий штат в Excel или перейдите к импорту для массовых обновлений.</p>
 </div>
 <div className="flex flex-col gap-2 sm:flex-row">
 <Button variant="outline"onClick={handleEmployeesExport} disabled={isExporting}>
 <Download className="mr-2 h-4 w-4"/> {isExporting ? 'Готовим...' : 'Шаблон Excel'}
 </Button>
 <Button onClick={() => navigate('/integration#employees')}>
 <UploadCloud className="mr-2 h-4 w-4"/> Перейти к импорту
 </Button>
 </div>
 </Card>

 {/* Reminders Widget */}
 {reminders && (reminders.medicalCheckups.length > 0 || reminders.attestations.length > 0) && (
 <Card className="mb-6 p-4 bg-[rgba(255,149,0,0.06)] border-[rgba(255,149,0,0.2)] shadow-subtle">
 <div className="flex items-start">
 <AlertCircle className="h-5 w-5 text-macos-orange mr-3 mt-0.5"/>
 <div className="flex-1">
 <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-macos-orange mb-2">Напоминания</h3>
 
 {reminders.medicalCheckups.length > 0 && (
 <div className="mb-3">
 <p className="text-[11px] font-medium uppercase tracking-widest text-primary mb-1">
 Медосмотры ({reminders.medicalCheckups.length}):
 </p>
 <ul className="text-[14px] leading-relaxed text-secondary space-y-1">
 {reminders.medicalCheckups.map((emp: any) => (
 <li key={emp.id}>
 {emp.firstName} {emp.lastName} ({emp.position}) - через {emp.daysUntil} дн.
 </li>
 ))}
 </ul>
 </div>
 )}

 {reminders.attestations.length > 0 && (
 <div>
 <p className="text-[11px] font-medium uppercase tracking-widest text-primary mb-1">
 Аттестации ({reminders.attestations.length}):
 </p>
 <ul className="text-[14px] leading-relaxed text-secondary space-y-1">
 {reminders.attestations.map((emp: any) => (
 <li key={emp.id}>
 {emp.firstName} {emp.lastName} ({emp.position}) - через {emp.daysUntil} дн.
 </li>
 ))}
 </ul>
 </div>
 )}
 </div>
 </div>
 </Card>
 )}

 <div className="mb-4 flex justify-end">
 <Button onClick={handleCreate}>
 <PlusCircle className="mr-2 h-4 w-4"/> Добавить сотрудника
 </Button>
 </div>
 <DataTable
 columns={columns}
 data={data}
 page={page}
 pageSize={10}
 total={total}
 onPageChange={setPage}
 />
 <Modal
 isOpen={isModalOpen}
 onClose={() => setIsModalOpen(false)}
 title={editingEmployee ? 'Редактировать данные' : 'Добавить нового сотрудника'}
 >
 <EmployeeForm
 initialData={editingEmployee}
 onSuccess={handleFormSuccess}
 onCancel={() => setIsModalOpen(false)}
 />
 </Modal>

 {/* Delete Confirmation Modal */}
 <Modal
 isOpen={!!deleteConfirm}
 onClose={() => setDeleteConfirm(null)}
 title="Удаление сотрудника"
 >
 <div className="p-4">
 <div className="flex items-start gap-4 mb-4">
 <div className="p-2 bg-[rgba(255,59,48,0.12)] rounded-lg">
 <AlertCircle className="h-6 w-6 text-macos-red"/>
 </div>
 <div>
 <p className="text-[14px] font-semibold tracking-[-0.01em] text-primary">Вы уверены, что хотите удалить сотрудника?</p>
 <p className="text-[14px] leading-relaxed text-secondary mt-1">
 <strong>{deleteConfirm?.lastName} {deleteConfirm?.firstName}</strong> ({deleteConfirm?.position})
 </p>
 {deleteConfirm?.user && (
 <p className="text-[11px] font-medium uppercase tracking-widest text-macos-orange mt-2">
 ⚠️ У сотрудника есть привязанный аккаунт ({deleteConfirm.user.email}), он тоже будет удалён.
 </p>
 )}
 <p className="text-[11px] font-medium uppercase tracking-widest text-macos-red mt-2">
 Это действие нельзя отменить!
 </p>
 </div>
 </div>
 <div className="flex justify-end gap-2">
 <Button variant="ghost"onClick={() => setDeleteConfirm(null)} disabled={isDeleting}>
 Отмена
 </Button>
 <Button variant="destructive"onClick={handleDelete} disabled={isDeleting}>
 {isDeleting ? 'Удаление...' : 'Удалить'}
 </Button>
 </div>
 </div>
 </Modal>
 </div>
 );
}