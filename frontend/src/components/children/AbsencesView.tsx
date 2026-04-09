// src/components/children/AbsencesView.tsx
// Отдельный компонент управления отсутствиями ребёнка
import { useState} from 'react';
import { PlusCircle, AlertTriangle} from 'lucide-react';
import { Button} from '../ui/button';
import { Input} from '../ui/input';
import { Modal, ModalActions, ModalNotice, ModalSection} from '../Modal';
import { useAbsences} from '../../hooks/useChildren';
import type { TemporaryAbsence} from '../../types/child';

interface AbsencesViewProps {
 childId: number;
}

export function AbsencesView({ childId}: AbsencesViewProps) {
 const { absences, loading, addAbsence, deleteAbsence} = useAbsences(childId);

 const [showForm, setShowForm] = useState(false);
 const [startDate, setStartDate] = useState('');
 const [endDate, setEndDate] = useState('');
 const [reason, setReason] = useState('');
 const [submitting, setSubmitting] = useState(false);

 const [deleteConfirm, setDeleteConfirm] = useState<TemporaryAbsence | null>(null);
 const [isDeleting, setIsDeleting] = useState(false);

 const handleAdd = async (e: React.FormEvent) => {
 e.preventDefault();
 setSubmitting(true);
 try {
 await addAbsence({ startDate, endDate, reason});
 setShowForm(false);
 setStartDate('');
 setEndDate('');
 setReason('');
} catch {
 // toast already shown by hook
} finally {
 setSubmitting(false);
}
};

 const handleDelete = async () => {
 if (!deleteConfirm) return;
 setIsDeleting(true);
 try {
 await deleteAbsence(deleteConfirm.id);
 setDeleteConfirm(null);
} catch {
 // toast already shown by hook
} finally {
 setIsDeleting(false);
}
};

 if (loading) return <div className="p-4 text-sm text-secondary">Загрузка...</div>;

 return (
 <div className="space-y-4">
 {!showForm ? (
 <Button onClick={() => setShowForm(true)} size="sm">
 <PlusCircle className="mr-2 h-4 w-4"/> Добавить отсутствие
 </Button>
 ) : (
 <form onSubmit={handleAdd} className="rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-[rgba(255,255,255,0.74)] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)] space-y-4">
 <div>
 <label className="mezon-form-label">Дата начала</label>
 <Input type="date"value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
 </div>
 <div>
 <label className="mezon-form-label">Дата окончания</label>
 <Input type="date"value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
 </div>
 <div>
 <label className="mezon-form-label">Причина</label>
 <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Семейный отпуск"required />
 </div>
 <div className="mezon-modal-inline-actions !border-t-0 !pt-0">
 <Button type="submit"size="sm"disabled={submitting}>{submitting ? 'Сохранение...' : 'Сохранить'}</Button>
 <Button type="button"variant="ghost"size="sm"onClick={() => setShowForm(false)}>Отмена</Button>
 </div>
 </form>
 )}

 <div className="space-y-3">
 {absences.length === 0 ? (
 <ModalNotice title="Пока без записей" tone="info">
 В этом журнале ещё нет периодов отсутствия. Добавьте новый интервал, если ребёнок временно не посещает занятия.
 </ModalNotice>
 ) : (
 absences.map((absence) => (
 <div key={absence.id} className="flex items-start justify-between gap-4 rounded-[18px] border border-[rgba(15,23,42,0.08)] bg-[rgba(255,255,255,0.74)] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
 <div>
 <div className="font-medium text-sm text-primary">
 {new Date(absence.startDate).toLocaleDateString('ru-RU')} &mdash; {new Date(absence.endDate).toLocaleDateString('ru-RU')}
 </div>
 {absence.reason ? <div className="mt-1 text-sm text-secondary">{absence.reason}</div> : null}
 </div>
 <Button variant="destructive"size="sm"onClick={() => setDeleteConfirm(absence)}>Удалить</Button>
 </div>
 ))
 )}
 </div>

 {/* Delete confirmation */}
 <Modal
 isOpen={!!deleteConfirm}
 onClose={() => setDeleteConfirm(null)}
 title="Удаление отсутствия"
 eyebrow="Опасное действие"
 description="Запись будет удалена из журнала посещаемости без возможности восстановления."
 icon={<AlertTriangle className="h-5 w-5"/>}
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
 <ModalNotice title="Проверьте период" tone="danger">
 Удаление записи сразу изменит картину отсутствий в карточке ребёнка и в сопутствующих журналах.
 </ModalNotice>

 {deleteConfirm ? (
 <ModalSection title="Период отсутствия" description="Убедитесь, что удаляете правильную запись.">
 <div className="mezon-modal-facts">
 <div className="mezon-modal-fact">
 <span className="mezon-modal-fact__label">Даты</span>
 <span className="mezon-modal-fact__value">{new Date(deleteConfirm.startDate).toLocaleDateString('ru-RU')} &mdash; {new Date(deleteConfirm.endDate).toLocaleDateString('ru-RU')}</span>
 </div>
 <div className="mezon-modal-fact">
 <span className="mezon-modal-fact__label">Причина</span>
 <span className="mezon-modal-fact__value">{deleteConfirm.reason || 'Не указана'}</span>
 </div>
 </div>
 </ModalSection>
 ) : null}
 </Modal>
 </div>
 );
}
