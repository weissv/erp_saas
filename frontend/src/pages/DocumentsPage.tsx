import { useState} from 'react';
import { toast} from 'sonner';
import { useApi} from '../hooks/useApi';
import { DataTable, Column} from '../components/DataTable/DataTable';
import { Button} from '../components/ui/button';
import { Modal, ModalActions, ModalNotice, ModalSection} from '../components/Modal';
import { PlusCircle, FileText, AlertTriangle} from 'lucide-react';
import { Document, DocumentTemplate} from '../types/document';
import { DocumentForm} from '../components/forms/DocumentForm';
import { DocumentTemplateForm} from '../components/forms/DocumentTemplateForm';
import { api} from '../lib/api';

export default function DocumentsPage() {
 const { data, total, page, setPage, fetchData} = useApi<Document>({
 url: '/api/documents',
});
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
 const [editingDocument, setEditingDocument] = useState<Document | null>(null);
 const [viewMode, setViewMode] = useState<'documents' | 'templates'>('documents');
 
 // Delete confirmation modal
 const [deleteModalOpen, setDeleteModalOpen] = useState(false);
 const [deletingDocument, setDeletingDocument] = useState<Document | null>(null);
 const [deleting, setDeleting] = useState(false);

 const handleCreateDocument = () => {
 setEditingDocument(null);
 setIsModalOpen(true);
};

 const handleEditDocument = (doc: Document) => {
 setEditingDocument(doc);
 setIsModalOpen(true);
};

 const openDeleteModal = (doc: Document) => {
 setDeletingDocument(doc);
 setDeleteModalOpen(true);
};

 const handleDelete = async () => {
 if (!deletingDocument) return;
 setDeleting(true);
 try {
 await api.delete(`/api/documents/${deletingDocument.id}`);
 toast.success('Документ удален');
 setDeleteModalOpen(false);
 setDeletingDocument(null);
 fetchData();
} catch (error: any) {
 toast.error('Ошибка удаления', { description: error?.message});
} finally {
 setDeleting(false);
}
};

 const handleFormSuccess = () => {
 setIsModalOpen(false);
 setIsTemplateModalOpen(false);
 fetchData();
 toast.success(editingDocument ? 'Документ обновлен' : 'Документ создан');
};

 const documentsColumns: Column<Document>[] = [
 { key: 'id', header: 'ID'},
 { key: 'name', header: 'Название'},
 { 
 key: 'template', 
 header: 'Шаблон', 
 render: (row) => row.template?.name || '—' 
},
 {
 key: 'employee',
 header: 'Сотрудник',
 render: (row) => row.employee ? `${row.employee.firstName} ${row.employee.lastName}`: '—'
},
 {
 key: 'child',
 header: 'Ребенок',
 render: (row) => row.child ? `${row.child.firstName} ${row.child.lastName}`: '—'
},
 {
 key: 'createdAt',
 header: 'Создан',
 render: (row) => new Date(row.createdAt).toLocaleDateString('ru-RU')
},
 {
 key: 'actions',
 header: 'Действия',
 render: (row) => (
 <div className="flex gap-2">
 <Button variant="outline"size="sm"onClick={() => handleEditDocument(row)}>
 Редактировать
 </Button>
 <a 
 href={row.fileUrl} 
 target="_blank"
 rel="noopener noreferrer"
 className="inline-flex items-center justify-center h-8 px-3 text-sm rounded-md text-gray-800 hover:bg-fill-tertiary"
 >
 Скачать
 </a>
 <Button variant="destructive"size="sm"onClick={() => openDeleteModal(row)}>
 Удалить
 </Button>
 </div>
 ),
},
 ];

 return (
 <div>
 <div className="flex justify-between items-center mb-4">
 <h1 className="text-[24px] font-bold tracking-[-0.025em] leading-tight">Управление документами</h1>
 <div className="flex gap-2">
 <Button
 variant={viewMode === 'documents' ? 'default' : 'outline'}
 onClick={() => setViewMode('documents')}
 >
 <FileText className="mr-2 h-4 w-4"/> Документы
 </Button>
 <Button
 variant={viewMode === 'templates' ? 'default' : 'outline'}
 onClick={() => setViewMode('templates')}
 >
 Шаблоны
 </Button>
 </div>
 </div>

 {viewMode === 'documents' ? (
 <>
 <div className="mb-4 flex justify-end">
 <Button onClick={handleCreateDocument}>
 <PlusCircle className="mr-2 h-4 w-4"/> Добавить документ
 </Button>
 </div>
 <DataTable
 columns={documentsColumns}
 data={data}
 page={page}
 pageSize={10}
 total={total}
 onPageChange={setPage}
 />
 <Modal
 isOpen={isModalOpen}
 onClose={() => setIsModalOpen(false)}
 title={editingDocument ? 'Редактировать документ' : 'Новый документ'}
 eyebrow="Документооборот"
 description="Заполните карточку документа так, чтобы его было легко найти по названию, файлу и привязке к сотруднику или ученику."
 icon={<FileText className="h-5 w-5"/>}
 size="xl"
 meta={editingDocument ? <span className="mezon-badge macos-badge-neutral">Редактирование</span> : <span className="mezon-badge">Новый файл</span>}
 >
 <DocumentForm
 initialData={editingDocument}
 onSuccess={handleFormSuccess}
 onCancel={() => setIsModalOpen(false)}
 />
 </Modal>
 
 {/* Delete confirmation modal */}
 <Modal
 isOpen={deleteModalOpen}
 onClose={() => setDeleteModalOpen(false)}
 title="Удаление документа"
 eyebrow="Опасное действие"
 description="Документ будет удалён без возможности восстановления. Перед подтверждением проверьте, что выбрали правильный файл."
 icon={<AlertTriangle className="h-5 w-5"/>}
 tone="danger"
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
 <ModalNotice title="Удаление необратимо" tone="danger">
 Если документ уже использовался в работе сотрудников или связан с учеником, после удаления его придётся загружать заново.
 </ModalNotice>

 {deletingDocument ? (
 <ModalSection title="Проверка файла" description="Сверьте ключевые реквизиты перед удалением.">
 <div className="mezon-modal-facts">
 <div className="mezon-modal-fact">
 <span className="mezon-modal-fact__label">Название</span>
 <span className="mezon-modal-fact__value">{deletingDocument.name}</span>
 </div>
 {deletingDocument.employee ? (
 <div className="mezon-modal-fact">
 <span className="mezon-modal-fact__label">Сотрудник</span>
 <span className="mezon-modal-fact__value">{deletingDocument.employee.firstName} {deletingDocument.employee.lastName}</span>
 </div>
 ) : null}
 {deletingDocument.child ? (
 <div className="mezon-modal-fact">
 <span className="mezon-modal-fact__label">Ученик</span>
 <span className="mezon-modal-fact__value">{deletingDocument.child.firstName} {deletingDocument.child.lastName}</span>
 </div>
 ) : null}
 </div>
 </ModalSection>
 ) : null}
 </Modal>
 </>
 ) : (
 <TemplatesView onTemplateCreated={handleFormSuccess} />
 )}
 </div>
 );
}

function TemplatesView({ onTemplateCreated}: { onTemplateCreated: () => void}) {
 const { data, total, page, setPage, fetchData} = useApi<DocumentTemplate>({
 url: '/api/documents/templates',
});
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
 
 // Delete confirmation modal
 const [deleteModalOpen, setDeleteModalOpen] = useState(false);
 const [deletingTemplate, setDeletingTemplate] = useState<DocumentTemplate | null>(null);
 const [deleting, setDeleting] = useState(false);

 const handleCreate = () => {
 setEditingTemplate(null);
 setIsModalOpen(true);
};

 const handleEdit = (template: DocumentTemplate) => {
 setEditingTemplate(template);
 setIsModalOpen(true);
};

 const openDeleteModal = (template: DocumentTemplate) => {
 setDeletingTemplate(template);
 setDeleteModalOpen(true);
};

 const handleDelete = async () => {
 if (!deletingTemplate) return;
 setDeleting(true);
 try {
 await api.delete(`/api/documents/templates/${deletingTemplate.id}`);
 toast.success('Шаблон удален');
 setDeleteModalOpen(false);
 setDeletingTemplate(null);
 fetchData();
} catch (error: any) {
 toast.error('Ошибка удаления', { description: error?.message});
} finally {
 setDeleting(false);
}
};

 const handleSuccess = () => {
 setIsModalOpen(false);
 fetchData();
 onTemplateCreated();
 toast.success(editingTemplate ? 'Шаблон обновлен' : 'Шаблон создан');
};

 const columns: Column<DocumentTemplate>[] = [
 { key: 'id', header: 'ID'},
 { key: 'name', header: 'Название'},
 {
 key: 'content',
 header: 'Описание',
 render: (row) => row.content.substring(0, 50) + '...'
},
 {
 key: 'createdAt',
 header: 'Создан',
 render: (row) => new Date(row.createdAt).toLocaleDateString('ru-RU')
},
 {
 key: 'actions',
 header: 'Действия',
 render: (row) => (
 <div className="flex gap-2">
 <Button variant="outline"size="sm"onClick={() => handleEdit(row)}>
 Редактировать
 </Button>
 <Button variant="destructive"size="sm"onClick={() => openDeleteModal(row)}>
 Удалить
 </Button>
 </div>
 ),
},
 ];

 return (
 <>
 <div className="mb-4 flex justify-end">
 <Button onClick={handleCreate}>
 <PlusCircle className="mr-2 h-4 w-4"/> Добавить шаблон
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
 title={editingTemplate ? 'Редактировать шаблон' : 'Новый шаблон'}
 eyebrow="Шаблоны"
 description="Подготовьте шаблон так, чтобы из него было удобно быстро создавать типовые документы без повторного ручного ввода."
 icon={<FileText className="h-5 w-5"/>}
 size="xl"
 meta={editingTemplate ? <span className="mezon-badge macos-badge-neutral">Редактирование</span> : <span className="mezon-badge">Новый шаблон</span>}
 >
 <DocumentTemplateForm
 initialData={editingTemplate}
 onSuccess={handleSuccess}
 onCancel={() => setIsModalOpen(false)}
 />
 </Modal>
 
 {/* Delete confirmation modal */}
 <Modal
 isOpen={deleteModalOpen}
 onClose={() => setDeleteModalOpen(false)}
 title="Удаление шаблона"
 eyebrow="Опасное действие"
 description="Шаблон будет удалён из каталога, но уже созданные по нему документы останутся. Подтвердите действие только после проверки названия."
 icon={<AlertTriangle className="h-5 w-5"/>}
 tone="danger"
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
 <ModalNotice title="Что изменится после удаления" tone="danger">
 Шаблон исчезнет из каталога, поэтому новые документы по нему создать уже не получится. Ранее сформированные документы не будут затронуты.
 </ModalNotice>

 {deletingTemplate ? (
 <ModalSection title="Проверка шаблона" description="Убедитесь, что выбрали нужный шаблон из списка.">
 <div className="mezon-modal-facts">
 <div className="mezon-modal-fact">
 <span className="mezon-modal-fact__label">Название</span>
 <span className="mezon-modal-fact__value">{deletingTemplate.name}</span>
 </div>
 <div className="mezon-modal-fact">
 <span className="mezon-modal-fact__label">Содержимое</span>
 <span className="mezon-modal-fact__value">{deletingTemplate.content.slice(0, 80)}{deletingTemplate.content.length > 80 ? '...' : ''}</span>
 </div>
 </div>
 </ModalSection>
 ) : null}
 </Modal>
 </>
 );
}
