import { useState} from 'react';
import { toast} from 'sonner';
import { useApi} from '../hooks/useApi';
import { useAuth} from '../hooks/useAuth';
import { DataTable, Column} from '../components/DataTable/DataTable';
import { Button} from '../components/ui/button';
import { Modal, ModalActions, ModalNotice, ModalSection} from '../components/Modal';
import { MessageCircleWarning, ShieldAlert, AlertTriangle, Bug} from 'lucide-react';
import { Feedback, FeedbackStatus} from '../types/feedback';
import { FeedbackResponseForm} from '../components/forms/FeedbackResponseForm';
import { BugReportForm} from '../components/forms/BugReportForm';
import { api} from '../lib/api';

export default function FeedbackPage() {
 const { user} = useAuth();
 const canManageFeedback = ['DEVELOPER', 'DIRECTOR', 'DEPUTY', 'ADMIN'].includes(user?.role || '');
 const { data, total, page, setPage, fetchData} = useApi<Feedback>({
 url: '/api/feedback',
 filters: { type: 'Баг-репорт'},
 enabled: canManageFeedback,
});
 const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
 const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
 
 // Delete confirmation modal
 const [deleteModalOpen, setDeleteModalOpen] = useState(false);
 const [deletingFeedback, setDeletingFeedback] = useState<Feedback | null>(null);
 const [deleting, setDeleting] = useState(false);

 const handleRespond = (feedback: Feedback) => {
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
 toast.success('Обращение удалено');
 setDeleteModalOpen(false);
 setDeletingFeedback(null);
 fetchData();
} catch (error: any) {
 toast.error('Ошибка удаления', { description: error?.message});
} finally {
 setDeleting(false);
}
};

 const handleFormSuccess = () => {
 setIsResponseModalOpen(false);
 if (canManageFeedback) {
 fetchData();
}
 toast.success('Изменения сохранены');
};

 const handleBugReportSuccess = () => {
 if (canManageFeedback) {
 fetchData();
}
};

 const getStatusBadge = (status: FeedbackStatus) => {
 const styles = {
 NEW: 'bg-[rgba(0,122,255,0.12)] text-blue-800',
 IN_PROGRESS: 'bg-[rgba(255,204,0,0.12)] text-yellow-800',
 RESOLVED: 'bg-[rgba(52,199,89,0.12)] text-green-800',
};
 const labels = {
 NEW: 'Новое',
 IN_PROGRESS: 'В работе',
 RESOLVED: 'Решено',
};
 return (
 <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
 {labels[status]}
 </span>
 );
};

 const columns: Column<Feedback>[] = [
 { key: 'id', header: 'ID'},
 {
 key: 'status',
 header: 'Статус',
 render: (row) => getStatusBadge(row.status)
},
 { key: 'type', header: 'Тип'},
 { key: 'parentName', header: 'Автор'},
 { key: 'contactInfo', header: 'Контакты'},
 { 
 key: 'message', 
 header: 'Описание',
 render: (row) => row.message.substring(0, 80) + (row.message.length > 80 ? '...' : '')
},
 {
 key: 'createdAt',
 header: 'Создано',
 render: (row) => new Date(row.createdAt).toLocaleDateString('ru-RU')
},
 {
 key: 'actions',
 header: 'Действия',
 render: (row) => (
 <div className="flex gap-2">
 {row.status !== 'RESOLVED' && (
 <Button variant="outline"size="sm"onClick={() => handleRespond(row)}>
 Ответить
 </Button>
 )}
 {row.response && (
 <Button 
 variant="ghost"
 size="sm"
 onClick={() => {
 setSelectedFeedback(row);
 alert(`Ответ: ${row.response}`);
}}
 >
 Просмотр
 </Button>
 )}
 <Button variant="destructive"size="sm"onClick={() => openDeleteModal(row)}>
 Удалить
 </Button>
 </div>
 ),
},
 ];

 return (
 <div className='space-y-6'>
 <div className='flex flex-col gap-2'>
 <h1 className='flex items-center gap-2 text-3xl font-bold'>
 <Bug className='h-7 w-7 text-rose-600' />
 Баг-репорт
 </h1>
 <p className='max-w-3xl text-secondary'>
 Сообщите о проблеме в системе. Новый репорт сохраняется в ERP и сразу отправляется разработчику в Telegram через тот же бот, который уже рассылает служебные заявки.
 </p>
 </div>

 <div className='grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]'>
 <div className='rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-6 shadow-sm'>
 <div className='mb-5 flex items-start gap-3'>
 <div className='rounded-xl bg-rose-50 p-3 text-rose-600'>
 <MessageCircleWarning className='h-5 w-5' />
 </div>
 <div>
 <h2 className='text-xl font-semibold'>Новый баг-репорт</h2>
 <p className='text-sm text-secondary'>
 Чем точнее сценарий и ожидаемое поведение, тем быстрее получится воспроизвести и исправить проблему.
 </p>
 </div>
 </div>

 <BugReportForm onSuccess={handleBugReportSuccess} />
 </div>

 <div className='space-y-4'>
 <div className='rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm'>
 <div className='flex items-start gap-3'>
 <ShieldAlert className='mt-0.5 h-5 w-5 text-amber-700' />
 <div>
 <h3 className='font-semibold text-amber-950'>Что попадёт разработчику</h3>
 <p className='mt-1 text-sm text-amber-900'>
 Заголовок, критичность, текущая страница, описание проблемы, шаги воспроизведения и техническая информация о браузере.
 </p>
 </div>
 </div>
 </div>

 <div className='rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm'>
 <h3 className='font-semibold text-slate-900'>Перед отправкой</h3>
 <ul className='mt-3 space-y-2 text-sm text-slate-700'>
 <li>Укажите страницу, где воспроизводится ошибка.</li>
 <li>Опишите, что вы ожидали увидеть.</li>
 <li>Если ошибка повторяется, добавьте пошаговый сценарий.</li>
 </ul>
 </div>
 </div>
 </div>

 {canManageFeedback && (
 <div className='space-y-4'>
 <div className='flex items-center justify-between'>
 <div>
 <h2 className='text-xl font-semibold'>Журнал баг-репортов</h2>
 <p className='text-sm text-secondary'>Административный обзор отправленных сообщений для разбора и ответа.</p>
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
 </div>
 )}

 <Modal
 isOpen={isResponseModalOpen}
 onClose={() => setIsResponseModalOpen(false)}
 title='Ответ на баг-репорт'
 eyebrow='Разбор обращения'
 description='Перед ответом проверьте исходный баг-репорт, затем зафиксируйте понятный ответ и актуальный статус, чтобы историю было легко восстановить позже.'
 icon={<MessageCircleWarning className='h-5 w-5' />}
 size='xl'
 meta={selectedFeedback ? getStatusBadge(selectedFeedback.status) : null}
 >
 {selectedFeedback && (
 <FeedbackResponseForm
 feedback={selectedFeedback}
 onSuccess={handleFormSuccess}
 onCancel={() => setIsResponseModalOpen(false)}
 />
 )}
 </Modal>

 {/* Delete confirmation modal */}
 <Modal
 isOpen={deleteModalOpen}
 onClose={() => setDeleteModalOpen(false)}
 title='Удаление баг-репорта'
 eyebrow='Опасное действие'
 description='Обращение исчезнет из журнала навсегда. Перед удалением проверьте автора, тип и фрагмент сообщения.'
 icon={<AlertTriangle className='h-5 w-5' />}
 tone='danger'
 closeOnBackdrop={!deleting}
 closeOnEscape={!deleting}
 footer={
 <ModalActions>
 <Button variant="outline"onClick={() => setDeleteModalOpen(false)} disabled={deleting}>
 Отмена
 </Button>
 <Button variant="destructive"onClick={handleDelete} disabled={deleting}>
 {deleting ? 'Удаление...' : 'Удалить'}
 </Button>
 </ModalActions>
 }
 >
 <ModalNotice title='Удаление необратимо' tone='danger'>
 После подтверждения обращение, история статусов и ответ будут удалены из административного журнала.
 </ModalNotice>

 {deletingFeedback ? (
 <ModalSection title='Карточка обращения' description='Сверьте данные, чтобы не удалить чужой или уже разобранный репорт.'>
 <div className='mezon-modal-facts'>
 <div className='mezon-modal-fact'>
 <span className='mezon-modal-fact__label'>Автор</span>
 <span className='mezon-modal-fact__value'>{deletingFeedback.parentName}</span>
 </div>
 <div className='mezon-modal-fact'>
 <span className='mezon-modal-fact__label'>Тип</span>
 <span className='mezon-modal-fact__value'>{deletingFeedback.type}</span>
 </div>
 <div className='mezon-modal-fact'>
 <span className='mezon-modal-fact__label'>Контакты</span>
 <span className='mezon-modal-fact__value'>{deletingFeedback.contactInfo}</span>
 </div>
 <div className='mezon-modal-fact'>
 <span className='mezon-modal-fact__label'>Статус</span>
 <span className='mezon-modal-fact__value'>{deletingFeedback.status === 'NEW' ? 'Новое' : deletingFeedback.status === 'IN_PROGRESS' ? 'В работе' : 'Решено'}</span>
 </div>
 </div>

 <ModalNotice title='Фрагмент сообщения' tone='warning'>
 {deletingFeedback.message.substring(0, 160)}{deletingFeedback.message.length > 160 ? '...' : ''}
 </ModalNotice>
 </ModalSection>
 ) : null}
 </Modal>
 </div>
 );
}
