import { useState, useEffect, useMemo} from 'react';
import { toast} from 'sonner';
import { api} from '../lib/api';
import { Card} from '../components/Card';
import { Button} from '../components/ui/button';
import { Modal} from '../components/Modal';
import { Input} from '../components/ui/input';
import { ScopedRegistersTab} from '../features/onec/components/scoped-registers-tab';
import { useOneCSummary} from '../features/onec';
import { HR_REGISTER_TYPES} from '../features/onec/register-groups';
import { 
 PlusCircle, 
 Trash2, 
 Edit2, 
 Users, 
 AlertTriangle,
 TrendingUp,
 TrendingDown,
 CheckCircle2,
 BarChart3,
 Search,
 UserCheck,
 Download,
 RefreshCw,
 Database,
} from 'lucide-react';

interface StaffingTable {
 id: number;
 position: string;
 requiredRate: number;
}

interface StaffingReport {
 position: string;
 requiredRate: number;
 currentRate: number;
 deficit: number;
}

interface Employee {
 id: number;
 firstName: string;
 lastName: string;
 position: string;
 rate: number;
}

export default function StaffingPage() {
 const [tables, setTables] = useState<StaffingTable[]>([]);
 const [report, setReport] = useState<StaffingReport[]>([]);
 const [employees, setEmployees] = useState<Employee[]>([]);
 const [loading, setLoading] = useState(true);
 const [activeTab, setActiveTab] = useState<'table' | 'report' | 'employees' | 'insights'>('table');
 const [searchQuery, setSearchQuery] = useState('');
 const { data: oneCSummary} = useOneCSummary();
 
 // Modal state
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [editingItem, setEditingItem] = useState<StaffingTable | null>(null);
 const [formData, setFormData] = useState({ position: '', requiredRate: ''});
 const [isSaving, setIsSaving] = useState(false);
 
 // Delete confirmation
 const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; item: StaffingTable | null}>({
 open: false,
 item: null
});
 const [isDeleting, setIsDeleting] = useState(false);
 
 // Position detail modal
 const [selectedPosition, setSelectedPosition] = useState<string | null>(null);

 useEffect(() => {
 fetchData();
}, []);

 const fetchData = async () => {
 setLoading(true);
 try {
 await Promise.all([fetchTables(), fetchReport(), fetchEmployees()]);
} catch (error: any) {
 toast.error('Ошибка загрузки данных', { description: error?.message});
} finally {
 setLoading(false);
}
};

 const fetchTables = async () => {
 try {
 const data = await api.get('/api/staffing/tables') as StaffingTable[];
 setTables(data);
} catch (error: any) {
 console.error('Error fetching staffing tables:', error);
}
};

 const fetchReport = async () => {
 try {
 const data = await api.get('/api/staffing/report') as StaffingReport[];
 setReport(data);
} catch (error: any) {
 console.error('Error fetching staffing report:', error);
}
};

 const fetchEmployees = async () => {
 try {
 const data = await api.get('/api/employees');
 // Handle both array and {items, total} formats
 const employeesList = Array.isArray(data) 
 ? data 
 : (data?.items || []);
 setEmployees(employeesList.filter(e => !('fireDate' in e) || !(e as any).fireDate));
} catch (error: any) {
 console.error('Error fetching employees:', error);
 setEmployees([]);
}
};

 const openCreateModal = () => {
 setEditingItem(null);
 setFormData({ position: '', requiredRate: '1'});
 setIsModalOpen(true);
};

 const openEditModal = (item: StaffingTable) => {
 setEditingItem(item);
 setFormData({
 position: item.position,
 requiredRate: item.requiredRate.toString()
});
 setIsModalOpen(true);
};

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!formData.position || !formData.requiredRate) {
 toast.error('Заполните все обязательные поля');
 return;
}

 setIsSaving(true);
 try {
 const payload = {
 position: formData.position.trim(),
 requiredRate: Number(formData.requiredRate)
};

 if (editingItem) {
 await api.put(`/api/staffing/tables/${editingItem.id}`, payload);
 toast.success('Позиция обновлена');
} else {
 await api.post('/api/staffing/tables', payload);
 toast.success('Позиция добавлена');
}
 
 setIsModalOpen(false);
 setEditingItem(null);
 fetchTables();
 fetchReport();
} catch (error: any) {
 toast.error('Ошибка сохранения', { description: error?.message});
} finally {
 setIsSaving(false);
}
};

 const openDeleteConfirm = (item: StaffingTable) => {
 setDeleteConfirm({ open: true, item});
};

 const handleDelete = async () => {
 if (!deleteConfirm.item) return;
 setIsDeleting(true);
 try {
 await api.delete(`/api/staffing/tables/${deleteConfirm.item.id}`);
 toast.success('Позиция удалена');
 setDeleteConfirm({ open: false, item: null});
 fetchTables();
 fetchReport();
} catch (error: any) {
 toast.error('Ошибка удаления', { description: error?.message});
} finally {
 setIsDeleting(false);
}
};

 // Calculate summary
 const summary = report.reduce(
 (acc, item) => ({
 totalRequired: acc.totalRequired + item.requiredRate,
 totalCurrent: acc.totalCurrent + item.currentRate,
 totalDeficit: acc.totalDeficit + Math.max(0, item.deficit)
}),
 { totalRequired: 0, totalCurrent: 0, totalDeficit: 0}
 );

 // Filter tables by search
 const filteredTables = useMemo(() => {
 if (!searchQuery.trim()) return tables;
 const query = searchQuery.toLowerCase();
 return tables.filter(t => t.position.toLowerCase().includes(query));
}, [tables, searchQuery]);

 // Filter report by search
 const filteredReport = useMemo(() => {
 if (!searchQuery.trim()) return report;
 const query = searchQuery.toLowerCase();
 return report.filter(r => r.position.toLowerCase().includes(query));
}, [report, searchQuery]);

 // Get employees by position
 const getEmployeesByPosition = (position: string) => {
 return employees.filter(e => e.position === position);
};

 // Export to CSV
 const exportToCSV = () => {
 const headers = ['Должность', 'По штату', 'Фактически', 'Дефицит', 'Статус'];
 const rows = report.map(item => [
 item.position,
 item.requiredRate.toString(),
 item.currentRate.toString(),
 item.deficit.toString(),
 item.deficit > 0 ? 'Недостаток' : item.deficit < 0 ? 'Избыток' : 'Укомплектовано'
 ]);
 
 const csvContent = [headers, ...rows]
 .map(row => row.map(cell => `"${cell}"`).join(','))
 .join('\n');
 
 const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;'});
 const url = URL.createObjectURL(blob);
 const link = document.createElement('a');
 link.href = url;
 link.download = `staffing-report-${new Date().toISOString().split('T')[0]}.csv`;
 link.click();
 URL.revokeObjectURL(url);
 toast.success('Отчёт экспортирован');
};

 if (loading) {
 return (
 <div className="flex items-center justify-center h-64">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
 </div>
 );
}

 return (
 <div className="space-y-6">
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
 <h1 className="text-[24px] font-bold tracking-[-0.025em] leading-tight flex items-center gap-2">
 <Users className="h-6 w-6"/>
 Штатное расписание
 </h1>
 <div className="flex gap-2">
 <Button variant="outline"onClick={() => fetchData()}>
 <RefreshCw className="mr-2 h-4 w-4"/> Обновить
 </Button>
 <Button variant="outline"onClick={exportToCSV}>
 <Download className="mr-2 h-4 w-4"/> Экспорт
 </Button>
 <Button onClick={openCreateModal}>
 <PlusCircle className="mr-2 h-4 w-4"/> Добавить позицию
 </Button>
 </div>
 </div>

 {/* Summary Cards */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <Card>
 <div className="p-4 flex items-center gap-4">
 <div className="p-3 bg-[rgba(0,122,255,0.12)] rounded-full">
 <Users className="h-6 w-6 text-macos-blue"/>
 </div>
 <div>
 <p className="text-sm text-secondary">По штату</p>
 <p className="text-[24px] font-bold tracking-[-0.025em] leading-tight">{summary.totalRequired.toFixed(1)} ставок</p>
 </div>
 </div>
 </Card>
 <Card>
 <div className="p-4 flex items-center gap-4">
 <div className="p-3 bg-[rgba(52,199,89,0.12)] rounded-full">
 <CheckCircle2 className="h-6 w-6 text-macos-green"/>
 </div>
 <div>
 <p className="text-sm text-secondary">Фактически</p>
 <p className="text-[24px] font-bold tracking-[-0.025em] leading-tight">{summary.totalCurrent.toFixed(1)} ставок</p>
 </div>
 </div>
 </Card>
 <Card>
 <div className="p-4 flex items-center gap-4">
 <div className={`p-3 rounded-full ${summary.totalDeficit > 0 ? 'bg-[rgba(255,59,48,0.12)]' : 'bg-[rgba(52,199,89,0.12)]'}`}>
 {summary.totalDeficit > 0 ? (
 <TrendingDown className="h-6 w-6 text-macos-red"/>
 ) : (
 <TrendingUp className="h-6 w-6 text-macos-green"/>
 )}
 </div>
 <div>
 <p className="text-sm text-secondary">Дефицит</p>
 <p className={`text-[24px] font-bold tracking-[-0.025em] leading-tight ${summary.totalDeficit > 0 ? 'text-macos-red' : 'text-macos-green'}`}>
 {summary.totalDeficit > 0 ? `-${summary.totalDeficit.toFixed(1)}`: '0'} ставок
 </p>
 </div>
 </div>
 </Card>
 </div>

 {/* Tabs */}
 <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
 <div className="flex gap-2">
 <Button
 variant={activeTab === 'table' ? 'default' : 'outline'}
 onClick={() => setActiveTab('table')}
 >
 Штатная таблица
 </Button>
 <Button
 variant={activeTab === 'report' ? 'default' : 'outline'}
 onClick={() => setActiveTab('report')}
 >
 <BarChart3 className="mr-2 h-4 w-4"/>
 Отчёт
 </Button>
 <Button
 variant={activeTab === 'employees' ? 'default' : 'outline'}
 onClick={() => setActiveTab('employees')}
 >
 <UserCheck className="mr-2 h-4 w-4"/>
 По сотрудникам
 </Button>
 <Button
  variant={activeTab === 'insights' ? 'default' : 'outline'}
  onClick={() => setActiveTab('insights')}
  >
  <Database className="mr-2 h-4 w-4"/>
  Графики и учёт 1С
  </Button>
 </div>
 <div className="relative w-full sm:w-64">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-tertiary"/>
 <Input
 type="text"
 placeholder="Поиск по должности..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="pl-9"
 />
 </div>
 </div>

 {/* Content */}
 {activeTab === 'insights' ? (
  <ScopedRegistersTab registerTypes={HR_REGISTER_TYPES} summary={oneCSummary} />
 ) : activeTab === 'table' ? (
 <div className="space-y-6">
 {filteredTables.length === 0 ? (
 <Card>
 <div className="p-8 text-center text-secondary">
 {searchQuery ? 'Позиции не найдены' : 'Штатное расписание пусто. Добавьте первую позицию.'}
 </div>
 </Card>
 ) : (
 <Card>
 <div className="divide-y">
 {filteredTables.map((item) => {
 const reportItem = report.find(r => r.position === item.position);
 const currentRate = reportItem?.currentRate || 0;
 const deficit = reportItem?.deficit || item.requiredRate;
 
 return (
 <div key={item.id} className="p-4 flex items-center justify-between hover:bg-fill-quaternary">
 <div className="flex-1">
 <div className="flex items-center gap-3">
 <p className="font-medium">{item.position}</p>
 {deficit > 0 && (
 <span className="inline-flex items-center px-2 py-0.5 bg-[rgba(255,59,48,0.12)] text-macos-red rounded text-xs">
 -{deficit}
 </span>
 )}
 {deficit < 0 && (
 <span className="inline-flex items-center px-2 py-0.5 bg-[rgba(0,122,255,0.12)] text-macos-blue rounded text-xs">
 +{Math.abs(deficit)}
 </span>
 )}
 {deficit === 0 && currentRate > 0 && (
 <span className="inline-flex items-center px-2 py-0.5 bg-[rgba(52,199,89,0.12)] text-macos-green rounded text-xs">
 <CheckCircle2 className="h-3 w-3 mr-1"/>
 Укомплектовано
 </span>
 )}
 </div>
 <div className="flex gap-4 mt-1">
 <p className="text-sm text-secondary">
 Требуется: <span className="font-medium text-primary">{item.requiredRate}</span> ставок
 </p>
 <p className="text-sm text-secondary">
 Фактически: <span className="font-medium text-primary">{currentRate}</span> ставок
 </p>
 </div>
 {/* Progress bar */}
 <div className="mt-2 h-2 bg-fill-secondary rounded-full overflow-hidden w-48">
 <div 
 className={`h-full macos-transition ${
 currentRate >= item.requiredRate ? 'bg-[rgba(52,199,89,0.06)]0' : 
 currentRate >= item.requiredRate * 0.7 ? 'bg-[rgba(255,204,0,0.06)]0' : 'bg-[rgba(255,59,48,0.06)]0'
}`}
 style={{ width: `${Math.min(100, (currentRate / item.requiredRate) * 100)}%`}}
 />
 </div>
 </div>
 <div className="flex gap-2">
 <Button 
 variant="ghost"
 size="sm"
 onClick={() => setSelectedPosition(item.position)}
 title="Показать сотрудников"
 >
 <UserCheck className="h-4 w-4"/>
 </Button>
 <Button variant="ghost"size="sm"onClick={() => openEditModal(item)}>
 <Edit2 className="h-4 w-4"/>
 </Button>
 <Button
 variant="ghost"
 size="sm"
 className="text-macos-red hover:text-macos-red hover:bg-[rgba(255,59,48,0.06)]"
 onClick={() => openDeleteConfirm(item)}
 >
 <Trash2 className="h-4 w-4"/>
 </Button>
 </div>
 </div>
 );
})}
 </div>
 </Card>
 )}
 </div>
 ) : activeTab === 'report' ? (
 <div className="space-y-6">
 {filteredReport.length === 0 ? (
 <Card>
 <div className="p-8 text-center text-secondary">
 {searchQuery ? 'Позиции не найдены' : 'Нет данных для отчёта. Добавьте штатные позиции.'}
 </div>
 </Card>
 ) : (
 <Card>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-fill-quaternary text-sm">
 <tr>
 <th className="px-4 py-3 text-left">Должность</th>
 <th className="px-4 py-3 text-center">По штату</th>
 <th className="px-4 py-3 text-center">Фактически</th>
 <th className="px-4 py-3 text-center">Дефицит</th>
 <th className="px-4 py-3 text-center">Укомплектованность</th>
 <th className="px-4 py-3 text-center">Статус</th>
 </tr>
 </thead>
 <tbody className="divide-y">
 {filteredReport.map((item, idx) => {
 const percentage = item.requiredRate > 0 
 ? Math.round((item.currentRate / item.requiredRate) * 100) 
 : 0;
 return (
 <tr key={idx} className="hover:bg-fill-quaternary">
 <td className="px-4 py-3">
 <button 
 className="font-medium hover:text-macos-blue hover:underline text-left"
 onClick={() => setSelectedPosition(item.position)}
 >
 {item.position}
 </button>
 </td>
 <td className="px-4 py-3 text-center">{item.requiredRate}</td>
 <td className="px-4 py-3 text-center">{item.currentRate}</td>
 <td className="px-4 py-3 text-center">
 <span className={item.deficit > 0 ? 'text-macos-red font-medium' : item.deficit < 0 ? 'text-macos-blue font-medium' : 'text-macos-green'}>
 {item.deficit > 0 ? `-${item.deficit}`: item.deficit < 0 ? `+${Math.abs(item.deficit)}`: '0'}
 </span>
 </td>
 <td className="px-4 py-3">
 <div className="flex items-center gap-2">
 <div className="flex-1 h-2 bg-fill-secondary rounded-full overflow-hidden">
 <div 
 className={`h-full macos-transition ${
 percentage >= 100 ? 'bg-[rgba(52,199,89,0.06)]0' : 
 percentage >= 70 ? 'bg-[rgba(255,204,0,0.06)]0' : 'bg-[rgba(255,59,48,0.06)]0'
}`}
 style={{ width: `${Math.min(100, percentage)}%`}}
 />
 </div>
 <span className="text-sm text-secondary w-12 text-right">{percentage}%</span>
 </div>
 </td>
 <td className="px-4 py-3 text-center">
 {item.deficit > 0 ? (
 <span className="inline-flex items-center gap-1 px-2 py-1 bg-[rgba(255,59,48,0.12)] text-macos-red rounded-full text-xs">
 <AlertTriangle className="h-3 w-3"/>
 Недостаток
 </span>
 ) : item.deficit < 0 ? (
 <span className="inline-flex items-center gap-1 px-2 py-1 bg-[rgba(0,122,255,0.12)] text-macos-blue rounded-full text-xs">
 <TrendingUp className="h-3 w-3"/>
 Избыток
 </span>
 ) : (
 <span className="inline-flex items-center gap-1 px-2 py-1 bg-[rgba(52,199,89,0.12)] text-macos-green rounded-full text-xs">
 <CheckCircle2 className="h-3 w-3"/>
 Укомплектовано
 </span>
 )}
 </td>
 </tr>
 );
})}
 </tbody>
 </table>
 </div>
 </Card>
 )}
 </div>
 ) : (
 /* Employees tab */
 <div className="space-y-6">
 {tables.length === 0 ? (
 <Card>
 <div className="p-8 text-center text-secondary">
 Добавьте штатные позиции для просмотра сотрудников.
 </div>
 </Card>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {filteredTables.map((item) => {
 const positionEmployees = getEmployeesByPosition(item.position);
 const currentRate = positionEmployees.reduce((sum, e) => sum + e.rate, 0);
 const deficit = item.requiredRate - currentRate;
 
 return (
 <Card key={item.id}>
 <div className="p-4">
 <div className="flex items-center justify-between mb-3">
 <h3 className="font-semibold">{item.position}</h3>
 {deficit > 0 && (
 <span className="inline-flex items-center px-2 py-0.5 bg-[rgba(255,59,48,0.12)] text-macos-red rounded text-xs">
 -{deficit}
 </span>
 )}
 {deficit < 0 && (
 <span className="inline-flex items-center px-2 py-0.5 bg-[rgba(0,122,255,0.12)] text-macos-blue rounded text-xs">
 +{Math.abs(deficit)}
 </span>
 )}
 {deficit === 0 && currentRate > 0 && (
 <span className="inline-flex items-center px-2 py-0.5 bg-[rgba(52,199,89,0.12)] text-macos-green rounded text-xs">
 <CheckCircle2 className="h-3 w-3"/>
 </span>
 )}
 </div>
 <p className="text-sm text-secondary mb-3">
 {currentRate} из {item.requiredRate} ставок
 </p>
 {positionEmployees.length === 0 ? (
 <p className="text-sm text-tertiary italic">Нет сотрудников</p>
 ) : (
 <div className="space-y-2">
 {positionEmployees.map((emp) => (
 <div key={emp.id} className="flex items-center justify-between text-sm p-2 bg-fill-quaternary rounded">
 <span>{emp.lastName} {emp.firstName}</span>
 <span className="text-secondary">{emp.rate} ст.</span>
 </div>
 ))}
 </div>
 )}
 </div>
 </Card>
 );
})}
 </div>
 )}
 </div>
 )}

 {/* Create/Edit Modal */}
 <Modal
 isOpen={isModalOpen}
 onClose={() => setIsModalOpen(false)}
 title={editingItem ? 'Редактировать позицию' : 'Добавить позицию'}
 >
 <form onSubmit={handleSubmit} className="p-4 space-y-4">
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest mb-1">Должность *</label>
 <Input
 value={formData.position}
 onChange={(e) => setFormData({ ...formData, position: e.target.value})}
 placeholder="Например: Воспитатель"
 required
 />
 </div>
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest mb-1">Кол-во ставок *</label>
 <Input
 type="number"
 step="0.1"
 min="0.1"
 value={formData.requiredRate}
 onChange={(e) => setFormData({ ...formData, requiredRate: e.target.value})}
 placeholder="1"
 required
 />
 </div>
 <div className="flex justify-end gap-2 pt-2">
 <Button type="button"variant="outline"onClick={() => setIsModalOpen(false)} disabled={isSaving}>
 Отмена
 </Button>
 <Button type="submit"disabled={isSaving}>
 {isSaving ? 'Сохранение...' : editingItem ? 'Сохранить' : 'Добавить'}
 </Button>
 </div>
 </form>
 </Modal>

 {/* Delete Confirmation Modal */}
 <Modal isOpen={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, item: null})} title="Подтверждение удаления">
 <div className="p-4 space-y-4">
 <div className="flex items-start gap-3 p-4 bg-[rgba(255,59,48,0.06)] border border-red-200 rounded-lg">
 <AlertTriangle className="h-6 w-6 text-macos-red flex-shrink-0 mt-0.5"/>
 <div>
 <h4 className="font-semibold text-red-800">Внимание!</h4>
 <p className="text-macos-red text-sm mt-1">
 Вы собираетесь удалить позицию из штатного расписания. Это действие нельзя отменить.
 </p>
 </div>
 </div>
 {deleteConfirm.item && (
 <div className="bg-fill-quaternary p-3 rounded-lg">
 <p><strong>Должность:</strong> {deleteConfirm.item.position}</p>
 <p><strong>Ставок:</strong> {deleteConfirm.item.requiredRate}</p>
 </div>
 )}
 <div className="flex justify-end gap-2 pt-2">
 <Button variant="outline"onClick={() => setDeleteConfirm({ open: false, item: null})} disabled={isDeleting}>
 Отмена
 </Button>
 <Button variant="destructive"onClick={handleDelete} disabled={isDeleting}>
 {isDeleting ? 'Удаление...' : 'Удалить'}
 </Button>
 </div>
 </div>
 </Modal>

 {/* Position Employees Modal */}
 <Modal 
 isOpen={!!selectedPosition} 
 onClose={() => setSelectedPosition(null)} 
 title={`Сотрудники: ${selectedPosition}`}
 >
 <div className="p-4">
 {selectedPosition && (
 <>
 {(() => {
 const positionEmployees = getEmployeesByPosition(selectedPosition);
 const tableItem = tables.find(t => t.position === selectedPosition);
 const requiredRate = tableItem?.requiredRate || 0;
 const currentRate = positionEmployees.reduce((sum, e) => sum + e.rate, 0);
 const deficit = requiredRate - currentRate;
 
 return (
 <>
 <div className="flex items-center justify-between mb-4 p-3 bg-fill-quaternary rounded-lg">
 <div>
 <p className="text-sm text-secondary">Укомплектованность</p>
 <p className="text-lg font-bold">{currentRate} / {requiredRate} ставок</p>
 </div>
 {deficit > 0 && (
 <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-[rgba(255,59,48,0.12)] text-macos-red rounded-full text-[11px] font-medium uppercase tracking-widest">
 <AlertTriangle className="h-4 w-4"/>
 Не хватает {deficit}
 </span>
 )}
 {deficit < 0 && (
 <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-[rgba(0,122,255,0.12)] text-macos-blue rounded-full text-[11px] font-medium uppercase tracking-widest">
 <TrendingUp className="h-4 w-4"/>
 Избыток {Math.abs(deficit)}
 </span>
 )}
 {deficit === 0 && currentRate > 0 && (
 <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-[rgba(52,199,89,0.12)] text-macos-green rounded-full text-[11px] font-medium uppercase tracking-widest">
 <CheckCircle2 className="h-4 w-4"/>
 Укомплектовано
 </span>
 )}
 </div>
 
 {positionEmployees.length === 0 ? (
 <div className="text-center py-8 text-secondary">
 <Users className="h-12 w-12 mx-auto mb-2 text-tertiary"/>
 <p>На этой должности нет сотрудников</p>
 </div>
 ) : (
 <div className="space-y-2">
 {positionEmployees.map((emp) => (
 <div key={emp.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-fill-quaternary">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 bg-[rgba(0,122,255,0.12)] rounded-full flex items-center justify-center">
 <span className="text-macos-blue font-medium">
 {emp.firstName[0]}{emp.lastName[0]}
 </span>
 </div>
 <div>
 <p className="font-medium">{emp.lastName} {emp.firstName}</p>
 <p className="text-sm text-secondary">{emp.position}</p>
 </div>
 </div>
 <span className="px-3 py-1 bg-fill-tertiary rounded-full text-[11px] font-medium uppercase tracking-widest">
 {emp.rate} ставки
 </span>
 </div>
 ))}
 </div>
 )}
 </>
 );
})()}
 </>
 )}
 <div className="flex justify-end mt-4">
 <Button variant="outline"onClick={() => setSelectedPosition(null)}>
 Закрыть
 </Button>
 </div>
 </div>
 </Modal>
 </div>
 );
}
