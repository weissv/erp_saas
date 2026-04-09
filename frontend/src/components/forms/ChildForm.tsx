// src/components/forms/ChildForm.tsx
// Секционная форма создания/редактирования ребёнка
import { useEffect, useState} from 'react';
import { useForm, useFieldArray} from 'react-hook-form';
import { z} from 'zod';
import { zodResolver} from '@hookform/resolvers/zod';
import { toast} from 'sonner';
import { Loader2, PlusCircle, Trash2} from 'lucide-react';
import { api} from '../../lib/api';
import { Button} from '../ui/button';
import { Input} from '../ui/input';
import { FormError} from '../ui/FormError';
import { useGroups} from '../../hooks/useChildren';
import type { Child, Gender, ParentInput, HealthInfo} from '../../types/child';

// ===== Zod Schema =====

const parentSchema = z.object({
 id: z.number().optional(),
 fullName: z.string().min(1, 'ФИО обязательно'),
 relation: z.string().min(1, 'Укажите отношение'),
 phone: z.string().optional(),
 email: z.union([z.string().email('Некорректный email'), z.literal('')]).optional(),
 workplace: z.string().optional(),
});

const formSchema = z.object({
 // Основные данные
 lastName: z.string().min(1, 'Фамилия обязательна'),
 firstName: z.string().min(1, 'Имя обязательно'),
 middleName: z.string().optional(),
 birthDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Неверная дата'),
 groupId: z.coerce.number().positive('Выберите класс'),
 gender: z.enum(['MALE', 'FEMALE', '']).optional(),
 nationality: z.string().optional(),
 birthCertificateNumber: z.string().optional(),
 address: z.string().optional(),
 // Договор
 contractNumber: z.string().optional(),
 contractDate: z.string().optional(),
 // Медицина
 healthAllergies: z.string().optional(),
 healthConditions: z.string().optional(),
 healthMedications: z.string().optional(),
 healthNotes: z.string().optional(),
 // Родители
 parents: z.array(parentSchema).optional(),
});

type FormData = z.infer<typeof formSchema>;

// ===== Helpers =====

function parseHealthInfo(hi: HealthInfo | string | null | undefined): {
 healthAllergies: string;
 healthConditions: string;
 healthMedications: string;
 healthNotes: string;
} {
 if (!hi) return { healthAllergies: '', healthConditions: '', healthMedications: '', healthNotes: ''};
 if (typeof hi === 'string') return { healthAllergies: hi, healthConditions: '', healthMedications: '', healthNotes: ''};
 return {
 healthAllergies: hi.allergies?.join(', ') ?? '',
 healthConditions: hi.specialConditions?.join(', ') ?? '',
 healthMedications: hi.medications?.join(', ') ?? '',
 healthNotes: hi.notes ?? '',
};
}

function buildHealthInfo(data: FormData): HealthInfo | undefined {
 const allergies = data.healthAllergies?.split(',').map(s => s.trim()).filter(Boolean) ?? [];
 const specialConditions = data.healthConditions?.split(',').map(s => s.trim()).filter(Boolean) ?? [];
 const medications = data.healthMedications?.split(',').map(s => s.trim()).filter(Boolean) ?? [];
 const notes = data.healthNotes?.trim() || undefined;

 if (!allergies.length && !specialConditions.length && !medications.length && !notes) return undefined;
 return { allergies, specialConditions, medications, notes};
}

// ===== Component =====

type ChildFormProps = {
 initialData?: Child | null;
 onSuccess: () => void;
 onCancel: () => void;
};

export function ChildForm({ initialData, onSuccess, onCancel}: ChildFormProps) {
 const { groups, loading: isLoadingGroups} = useGroups();
 const healthDefaults = parseHealthInfo(initialData?.healthInfo);

 const {
 register,
 handleSubmit,
 control,
 formState: { errors, isSubmitting},
} = useForm<FormData>({
 resolver: zodResolver(formSchema),
 defaultValues: {
 lastName: initialData?.lastName ?? '',
 firstName: initialData?.firstName ?? '',
 middleName: initialData?.middleName ?? '',
 birthDate: initialData ? new Date(initialData.birthDate).toISOString().split('T')[0] : '',
 groupId: initialData?.group?.id ?? undefined,
 gender: (initialData?.gender as '' | 'MALE' | 'FEMALE') ?? '',
 nationality: initialData?.nationality ?? '',
 birthCertificateNumber: initialData?.birthCertificateNumber ?? '',
 address: initialData?.address ?? '',
 contractNumber: initialData?.contractNumber ?? '',
 contractDate: initialData?.contractDate ? new Date(initialData.contractDate).toISOString().split('T')[0] : '',
 ...healthDefaults,
 parents: initialData?.parents?.map((p) => ({
 id: p.id,
 fullName: p.fullName,
 relation: p.relation,
 phone: p.phone ?? '',
 email: p.email ?? '',
 workplace: p.workplace ?? '',
})) ?? [],
},
});

 const { fields: parentFields, append, remove} = useFieldArray({ control, name: 'parents'});

 const onSubmit = async (data: FormData) => {
 try {
 const healthInfo = buildHealthInfo(data);
 const parents: ParentInput[] | undefined = data.parents?.length
 ? data.parents.map((p) => ({
 ...(p.id ? { id: p.id} : {}),
 fullName: p.fullName,
 relation: p.relation,
 phone: p.phone || undefined,
 email: p.email || undefined,
 workplace: p.workplace || undefined,
}))
 : undefined;

 const payload: Record<string, any> = {
 firstName: data.firstName,
 lastName: data.lastName,
 middleName: data.middleName || undefined,
 birthDate: new Date(data.birthDate).toISOString(),
 groupId: data.groupId,
 gender: data.gender || undefined,
 nationality: data.nationality || undefined,
 birthCertificateNumber: data.birthCertificateNumber || undefined,
 address: data.address || undefined,
 contractNumber: data.contractNumber || undefined,
 contractDate: data.contractDate ? new Date(data.contractDate).toISOString() : undefined,
 healthInfo,
 parents,
};

 if (initialData) {
 await api.put(`/api/children/${initialData.id}`, payload);
} else {
 await api.post('/api/children', payload);
}
 onSuccess();
} catch (error: any) {
 const msg = error?.message || 'Ошибка сохранения';
 toast.error('Ошибка сохранения', { description: msg});
}
};

 return (
 <form onSubmit={handleSubmit(onSubmit)} className="mezon-modal-form">
 {/* ===== Секция 1: Основные данные ===== */}
 <fieldset className="space-y-4 rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-[rgba(255,255,255,0.72)] p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
 <legend className="px-1 text-[15px] font-semibold tracking-[-0.015em] text-primary">Основные данные</legend>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <label htmlFor="child-lastName" className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">Фамилия *</label>
 <Input id="child-lastName" {...register('lastName')} error={!!errors.lastName} aria-describedby={errors.lastName ? 'child-lastName-error' : undefined} />
 <FormError message={errors.lastName?.message} id="child-lastName-error" />
 </div>
 <div>
 <label htmlFor="child-firstName" className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">Имя *</label>
 <Input id="child-firstName" {...register('firstName')} error={!!errors.firstName} aria-describedby={errors.firstName ? 'child-firstName-error' : undefined} />
 <FormError message={errors.firstName?.message} id="child-firstName-error" />
 </div>
 <div>
 <label htmlFor="child-middleName" className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">Отчество</label>
 <Input id="child-middleName" {...register('middleName')} />
 </div>
 <div>
 <label htmlFor="child-groupId" className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">Класс *</label>
 <select
 id="child-groupId"
 className="mezon-field"
 disabled={isLoadingGroups}
 aria-describedby={errors.groupId ? 'child-groupId-error' : undefined}
 {...register('groupId', { valueAsNumber: true})}
 >
 <option value="">{isLoadingGroups ? 'Загружаем...' : 'Выберите класс'}</option>
 {groups.map((g) => (
 <option key={g.id} value={g.id}>{g.name}</option>
 ))}
 </select>
 <FormError message={errors.groupId?.message} id="child-groupId-error" />
 </div>
 <div>
 <label htmlFor="child-birthDate" className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">Дата рождения *</label>
 <Input id="child-birthDate" type="date" {...register('birthDate')} error={!!errors.birthDate} aria-describedby={errors.birthDate ? 'child-birthDate-error' : undefined} />
 <FormError message={errors.birthDate?.message} id="child-birthDate-error" />
 </div>
 <div>
 <label htmlFor="child-gender" className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">Пол</label>
 <select
 id="child-gender"
 className="mezon-field"
 {...register('gender')}
 >
 <option value="">Не указан</option>
 <option value="MALE">Мужской</option>
 <option value="FEMALE">Женский</option>
 </select>
 </div>
 <div>
 <label htmlFor="child-nationality" className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">Национальность</label>
 <Input id="child-nationality" {...register('nationality')} placeholder="узбек, русский и т.д."/>
 </div>
 <div>
 <label htmlFor="child-birthCertificateNumber" className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">Номер метрики</label>
 <Input id="child-birthCertificateNumber" {...register('birthCertificateNumber')} placeholder="I-TN № 0000000"/>
 </div>
 </div>
 <div className="mt-3">
 <label htmlFor="child-address" className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">Адрес проживания</label>
 <Input id="child-address" {...register('address')} placeholder="Район, улица, дом, квартира"/>
 </div>
 </fieldset>

 {/* ===== Секция 2: Родители ===== */}
 <fieldset className="space-y-4 rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-[rgba(255,255,255,0.72)] p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
 <legend className="px-1 text-[15px] font-semibold tracking-[-0.015em] text-primary">Родители / Опекуны</legend>
 {parentFields.map((field, index) => (
 <div key={field.id} className="relative rounded-[18px] border border-[rgba(15,23,42,0.08)] bg-[rgba(255,255,255,0.82)] p-4 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
 <Button
 type="button"
 variant="ghost"
 size="sm"
 className="absolute top-2 right-2 text-macos-red h-7 w-7 p-0"
 onClick={() => remove(index)}
 >
 <Trash2 className="h-4 w-4"/>
 </Button>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <label htmlFor={`child-parent-${index}-fullName`} className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">ФИО *</label>
 <Input id={`child-parent-${index}-fullName`} {...register(`parents.${index}.fullName`)} error={!!errors.parents?.[index]?.fullName} aria-describedby={errors.parents?.[index]?.fullName ? `child-parent-${index}-fullName-error` : undefined} />
 <FormError message={errors.parents?.[index]?.fullName?.message} id={`child-parent-${index}-fullName-error`} />
 </div>
 <div>
 <label htmlFor={`child-parent-${index}-relation`} className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">Отношение *</label>
 <select
 id={`child-parent-${index}-relation`}
 className="mezon-field"
 aria-describedby={errors.parents?.[index]?.relation ? `child-parent-${index}-relation-error` : undefined}
 {...register(`parents.${index}.relation`)}
 >
 <option value="">Выберите</option>
 <option value="отец">Отец</option>
 <option value="мать">Мать</option>
 <option value="опекун">Опекун</option>
 <option value="другое">Другое</option>
 </select>
 <FormError message={errors.parents?.[index]?.relation?.message} id={`child-parent-${index}-relation-error`} />
 </div>
 <div>
 <label htmlFor={`child-parent-${index}-phone`} className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">Телефон</label>
 <Input id={`child-parent-${index}-phone`} {...register(`parents.${index}.phone`)} placeholder="+998 90 000 00 00"/>
 </div>
 <div>
 <label htmlFor={`child-parent-${index}-email`} className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">Email</label>
 <Input id={`child-parent-${index}-email`} type="email" {...register(`parents.${index}.email`)} error={!!errors.parents?.[index]?.email} aria-describedby={errors.parents?.[index]?.email ? `child-parent-${index}-email-error` : undefined} />
 <FormError message={errors.parents?.[index]?.email?.message} id={`child-parent-${index}-email-error`} />
 </div>
 <div className="sm:col-span-2">
 <label htmlFor={`child-parent-${index}-workplace`} className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">Место работы</label>
 <Input id={`child-parent-${index}-workplace`} {...register(`parents.${index}.workplace`)} />
 </div>
 </div>
 </div>
 ))}
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => append({ fullName: '', relation: '', phone: '', email: '', workplace: ''})}
 >
 <PlusCircle className="mr-1 h-4 w-4"/> Добавить родителя
 </Button>
 </fieldset>

 {/* ===== Секция 3: Договор ===== */}
 <fieldset className="space-y-4 rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-[rgba(255,255,255,0.72)] p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
 <legend className="px-1 text-[15px] font-semibold tracking-[-0.015em] text-primary">Договор</legend>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <label htmlFor="child-contractNumber" className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">№ Договора</label>
 <Input id="child-contractNumber" {...register('contractNumber')} />
 </div>
 <div>
 <label htmlFor="child-contractDate" className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">Дата договора</label>
 <Input id="child-contractDate" type="date" {...register('contractDate')} />
 </div>
 </div>
 </fieldset>

 {/* ===== Секция 4: Мед. сведения ===== */}
 <fieldset className="space-y-4 rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-[rgba(255,255,255,0.72)] p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
 <legend className="px-1 text-[15px] font-semibold tracking-[-0.015em] text-primary">Медицинские сведения</legend>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <label htmlFor="child-healthAllergies" className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">Аллергии (через запятую)</label>
 <Input id="child-healthAllergies" {...register('healthAllergies')} placeholder="молоко, орехи"/>
 </div>
 <div>
 <label htmlFor="child-healthConditions" className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">Особые условия</label>
 <Input id="child-healthConditions" {...register('healthConditions')} placeholder="астма, диабет"/>
 </div>
 <div>
 <label htmlFor="child-healthMedications" className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">Медикаменты</label>
 <Input id="child-healthMedications" {...register('healthMedications')} placeholder="ингалятор"/>
 </div>
 <div>
 <label htmlFor="child-healthNotes" className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1">Примечания</label>
 <Input id="child-healthNotes" {...register('healthNotes')} />
 </div>
 </div>
 </fieldset>

 {/* ===== Кнопки ===== */}
 <div className="mezon-modal-inline-actions">
 <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>Отмена</Button>
 <Button type="submit" disabled={isSubmitting}>
 {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
 {isSubmitting ? 'Сохранение...' : 'Сохранить'}
 </Button>
 </div>
 </form>
 );
}
