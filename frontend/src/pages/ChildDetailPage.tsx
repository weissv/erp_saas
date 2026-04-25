// src/pages/ChildDetailPage.tsx
// Детальная карточка ребёнка
import React, { useState} from 'react';
import { useParams, useNavigate} from 'react-router-dom';
import { ArrowLeft, Edit, Archive, CalendarX, Users, BookOpen} from 'lucide-react';
import { Button} from '../components/ui/button';
import { Card} from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal, ModalNotice, ModalSection} from '../components/Modal';
import { ChildForm} from '../components/forms/ChildForm';
import { AbsencesView} from '../components/children/AbsencesView';
import { useChild, useChildMutations} from '../hooks/useChildren';
import { Skeleton, SkeletonCard } from '../components/ui/LoadingState';
import type { HealthInfo, Gender} from '../types/child';

const genderLabel = (g?: Gender | null) => {
 if (g === 'MALE') return 'Мужской';
 if (g === 'FEMALE') return 'Женский';
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

const statusColor = (s: string) => {
 switch (s) {
  case 'ACTIVE': return 'success';
  case 'LEFT': return 'warning';
  case 'ARCHIVED': return 'neutral';
  default: return 'neutral';
 }
};

function HealthBlock({ info}: { info: HealthInfo | null | undefined}) {
 if (!info) return <p className="text-sm text-tertiary">Не указана</p>;
 return (
 <div className="text-sm space-y-1">
 {info.allergies?.length ? <p><span className="font-medium">Аллергии:</span> {info.allergies.join(', ')}</p> : null}
 {info.specialConditions?.length ? <p><span className="font-medium">Особые условия:</span> {info.specialConditions.join(', ')}</p> : null}
 {info.medications?.length ? <p><span className="font-medium">Медикаменты:</span> {info.medications.join(', ')}</p> : null}
 {info.notes ? <p><span className="font-medium">Примечания:</span> {info.notes}</p> : null}
 </div>
 );
}

export default function ChildDetailPage() {
 const { id} = useParams<{ id: string}>();
 const navigate = useNavigate();
 const numId = id ? Number(id) : null;
 const { child, loading, error, refresh} = useChild(numId);
 const { archiveChild, saving} = useChildMutations();

 const [isEditOpen, setIsEditOpen] = useState(false);
 const [showAbsences, setShowAbsences] = useState(false);

 if (loading) {
  return (
    <div className="space-y-4">
      <Card className="border-border/70 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </Card>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
 }

 if (error || !child) {
  return (
  <Card className="border-border/70 p-8 text-center">
  <p className="mb-3 text-base font-semibold text-destructive">Ребёнок не найден</p>
  <p className="mb-6 text-sm text-muted-foreground">Профиль удалён, недоступен или вы перешли по неверной ссылке.</p>
  <Button variant="outline"onClick={() => navigate('/children')}>
  <ArrowLeft className="mr-2 h-4 w-4"/> К списку
  </Button>
  </Card>
  );
 }

 const fullName = [child.lastName, child.firstName, child.middleName].filter(Boolean).join(' ');

  return (
  <div className="mx-auto max-w-5xl space-y-4">
  {/* Header */}
  <Card className="border-border/70 p-6">
  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
  <div className="flex items-center gap-3">
  <Button variant="ghost"size="sm"onClick={() => navigate('/children')}>
  <ArrowLeft className="h-4 w-4"/>
  </Button>
  <div>
  <div className="mb-2 flex flex-wrap items-center gap-2">
  <Badge variant="neutral">Student profile</Badge>
  <Badge variant={statusColor(child.status) as 'success' | 'warning' | 'neutral'}>{statusLabel(child.status)}</Badge>
  <Badge variant="outline">{child.group.name}</Badge>
  </div>
  <h1 className="text-xl sm:text-[28px] font-semibold tracking-[-0.03em] leading-tight">{fullName}</h1>
  <p className="mt-2 text-sm leading-6 text-muted-foreground">Детальная карточка ученика с персональными данными, здоровьем, договором и историей отсутствий.</p>
  <div className="mt-3 grid gap-3 sm:grid-cols-3">
  <div className="rounded-xl border border-border bg-background px-4 py-3">
  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Дата рождения</p>
  <p className="mt-2 text-sm font-medium text-foreground">{new Date(child.birthDate).toLocaleDateString('ru-RU')}</p>
  </div>
  <div className="rounded-xl border border-border bg-background px-4 py-3">
  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Пол</p>
  <p className="mt-2 text-sm font-medium text-foreground">{genderLabel(child.gender as Gender)}</p>
  </div>
  <div className="rounded-xl border border-border bg-background px-4 py-3">
  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Класс</p>
  <p className="mt-2 text-sm font-medium text-foreground">{child.group.name}</p>
  </div>
  </div>
  </div>
  </div>
  <div className="flex flex-wrap gap-2">
  <Button size="sm"onClick={() => setIsEditOpen(true)}>
  <Edit className="mr-1 h-4 w-4"/> Редактировать
  </Button>
 <Button variant="outline"size="sm"onClick={() => setShowAbsences(true)}>
 <CalendarX className="mr-1 h-4 w-4"/> Отсутствия
 </Button>
 {child.status === 'ACTIVE' && (
 <Button
 variant="outline"
 size="sm"
 disabled={saving}
 onClick={async () => {
 await archiveChild(child.id);
 refresh();
}}
 >
 <Archive className="mr-1 h-4 w-4"/> В архив
  </Button>
  )}
  </div>
  </div>
  </Card>

  {/* Info Cards Grid */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {/* Основные данные */}
  <Card className="border-border/70 p-5">
  <h3 className="mb-3 text-sm font-semibold text-foreground">Основные данные</h3>
 <dl className="space-y-2 text-sm">
 <Row label="Дата рождения"value={new Date(child.birthDate).toLocaleDateString('ru-RU')} />
 <Row label="Пол"value={genderLabel(child.gender as Gender)} />
 <Row label="Национальность"value={child.nationality || '—'} />
 <Row label="Адрес"value={child.address || '—'} />
 <Row label="Номер метрики"value={child.birthCertificateNumber || '—'} />
 </dl>
 </Card>

 {/* Родители */}
  <Card className="border-border/70 p-5">
  <h3 className="mb-3 flex items-center gap-1 text-sm font-semibold text-foreground">
 <Users className="h-4 w-4"/> Родители / Опекуны
 </h3>
 {child.parents && child.parents.length > 0 ? (
 <div className="space-y-3">
 {child.parents.map((p) => (
 <div key={p.id} className="border-b pb-2 last:border-b-0 last:pb-0">
 <p className="font-medium text-sm">{p.fullName} <span className="text-secondary font-normal">({p.relation})</span></p>
 {p.phone && <p className="text-xs text-secondary">{p.phone}</p>}
 {p.email && <p className="text-xs text-secondary">{p.email}</p>}
 {p.workplace && <p className="text-xs text-tertiary">{p.workplace}</p>}
 </div>
 ))}
 </div>
 ) : (
 <p className="text-sm text-tertiary">
 {child.fatherName || child.motherName
 ? <>
 {child.fatherName && <span className="block">Отец: {child.fatherName}</span>}
 {child.motherName && <span className="block">Мать: {child.motherName}</span>}
 {child.parentPhone && <span className="block text-xs text-secondary">Тел: {child.parentPhone}</span>}
 </>
 : 'Не указана'}
 </p>
 )}
 </Card>

 {/* Договор */}
  <Card className="border-border/70 p-5">
  <h3 className="mb-3 text-sm font-semibold text-foreground">Договор</h3>
 <dl className="space-y-2 text-sm">
 <Row label="№ договора"value={child.contractNumber || '—'} />
 <Row label="Дата договора"value={child.contractDate ? new Date(child.contractDate).toLocaleDateString('ru-RU') : '—'} />
 </dl>
 </Card>

 {/* Мед. сведения */}
  <Card className="border-border/70 p-5">
  <h3 className="mb-3 text-sm font-semibold text-foreground">Медицинские сведения</h3>
 <HealthBlock info={child.healthInfo as HealthInfo | null} />
 </Card>

 {/* Кружки */}
 {child.enrollments && child.enrollments.length > 0 && (
  <Card className="border-border/70 p-5 md:col-span-2">
  <h3 className="mb-3 flex items-center gap-1 text-sm font-semibold text-foreground">
 <BookOpen className="h-4 w-4"/> Кружки
 </h3>
 <div className="flex flex-wrap gap-2">
 {child.enrollments.map((e) => (
 <span key={e.id} className="inline-block bg-tint-blue text-macos-blue text-xs px-2 py-1 rounded-full">
 {e.club.name}
 </span>
 ))}
 </div>
 </Card>
 )}

 {/* Последние отсутствия */}
 {child.temporaryAbsences && child.temporaryAbsences.length > 0 && (
  <Card className="border-border/70 p-5 md:col-span-2">
  <h3 className="mb-3 flex items-center gap-1 text-sm font-semibold text-foreground">
 <CalendarX className="h-4 w-4"/> Последние отсутствия
 </h3>
 <div className="space-y-1">
 {child.temporaryAbsences.map((a) => (
 <div key={a.id} className="flex items-center gap-2 text-sm">
 <span className="font-medium">
 {new Date(a.startDate).toLocaleDateString('ru-RU')} &mdash; {new Date(a.endDate).toLocaleDateString('ru-RU')}
 </span>
 {a.reason && <span className="text-secondary">— {a.reason}</span>}
 </div>
 ))}
 </div>
 </Card>
 )}
 </div>

 {/* Edit Modal */}
 <Modal
 isOpen={isEditOpen}
 onClose={() => setIsEditOpen(false)}
 title="Редактировать данные"
 eyebrow="Профиль ученика"
 description="Изменения в карточке ребёнка собраны по блокам, чтобы можно было спокойно проверить персональные данные, родителей, договор и медицинскую информацию."
 icon={<Edit className="h-5 w-5"/>}
 size="xl"
  meta={<Badge variant={statusColor(child.status) as 'success' | 'warning' | 'neutral'}>{statusLabel(child.status)}</Badge>}
 >
 <ChildForm
 initialData={child}
 onSuccess={() => { setIsEditOpen(false); refresh();}}
 onCancel={() => setIsEditOpen(false)}
 />
 </Modal>

 {/* Absences Modal */}
 <Modal
 isOpen={showAbsences}
 onClose={() => setShowAbsences(false)}
 title={`Отсутствия — ${fullName}`}
 eyebrow="Журнал посещаемости"
 description="Здесь администратор видит текущие периоды отсутствий и может быстро добавить новый интервал без перехода на другой экран."
 icon={<CalendarX className="h-5 w-5"/>}
 size="lg"
  meta={<Badge variant="neutral">{child.group.name}</Badge>}
 >
 <ModalNotice title="Контекст" tone="info">
 Проверяйте даты и причину отсутствия перед сохранением, чтобы классный руководитель и журнал посещаемости видели одинаковую картину.
 </ModalNotice>

 <ModalSection title="Записи по ученику" description="Все периоды отображаются в хронологии и доступны для удаления при ошибке ввода.">
 <AbsencesView childId={child.id} />
 </ModalSection>
 </Modal>
 </div>
 );
}

function Row({ label, value}: { label: string; value: string}) {
 return (
 <div className="flex justify-between">
 <dt className="text-secondary">{label}</dt>
 <dd className="font-medium text-right">{value}</dd>
 </div>
 );
}
