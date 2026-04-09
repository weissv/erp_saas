// src/components/forms/ChildForm.tsx
// Секционная форма создания/редактирования ребёнка
import { useEffect, useState} from 'react';
import { useForm, useFieldArray} from 'react-hook-form';
import { z} from 'zod';
import { zodResolver} from '@hookform/resolvers/zod';
import { toast} from 'sonner';
import { PlusCircle, Trash2} from 'lucide-react';
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
 <label className="mezon-form-label mezon-form-label--regular">Фамилия *</label>
 <Input {...register('lastName')} />
 <FormError message={errors.lastName?.message} />
 </div>
 <div>
 <label className="mezon-form-label mezon-form-label--regular">Имя *</label>
 <Input {...register('firstName')} />
 <FormError message={errors.firstName?.message} />
 </div>
 <div>
 <label className="mezon-form-label mezon-form-label--regular">Отчество</label>
 <Input {...register('middleName')} />
 </div>
 <div>
 <label className="mezon-form-label mezon-form-label--regular">Класс *</label>
 <select
 className="mezon-field"
 disabled={isLoadingGroups}
 {...register('groupId', { valueAsNumber: true})}
 >
 <option value="">{isLoadingGroups ? 'Загружаем...' : 'Выберите класс'}</option>
 {groups.map((g) => (
 <option key={g.id} value={g.id}>{g.name}</option>
 ))}
 </select>
 <FormError message={errors.groupId?.message} />
 </div>
 <div>
 <label className="mezon-form-label mezon-form-label--regular">Дата рождения *</label>
 <Input type="date"{...register('birthDate')} />
 <FormError message={errors.birthDate?.message} />
 </div>
 <div>
 <label className="mezon-form-label mezon-form-label--regular">Пол</label>
 <select
 className="mezon-field"
 {...register('gender')}
 >
 <option value="">Не указан</option>
 <option value="MALE">Мужской</option>
 <option value="FEMALE">Женский</option>
 </select>
 </div>
 <div>
 <label className="mezon-form-label mezon-form-label--regular">Национальность</label>
 <Input {...register('nationality')} placeholder="узбек, русский и т.д."/>
 </div>
 <div>
 <label className="mezon-form-label mezon-form-label--regular">Номер метрики</label>
 <Input {...register('birthCertificateNumber')} placeholder="I-TN № 0000000"/>
 </div>
 </div>
 <div className="mt-3">
 <label className="mezon-form-label mezon-form-label--regular">Адрес проживания</label>
 <Input {...register('address')} placeholder="Район, улица, дом, квартира"/>
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
 <label className="mezon-form-label mezon-form-label--regular">ФИО *</label>
 <Input {...register(`parents.${index}.fullName`)} />
 <FormError message={errors.parents?.[index]?.fullName?.message} />
 </div>
 <div>
 <label className="mezon-form-label mezon-form-label--regular">Отношение *</label>
 <select
 className="mezon-field"
 {...register(`parents.${index}.relation`)}
 >
 <option value="">Выберите</option>
 <option value="отец">Отец</option>
 <option value="мать">Мать</option>
 <option value="опекун">Опекун</option>
 <option value="другое">Другое</option>
 </select>
 <FormError message={errors.parents?.[index]?.relation?.message} />
 </div>
 <div>
 <label className="mezon-form-label mezon-form-label--regular">Телефон</label>
 <Input {...register(`parents.${index}.phone`)} placeholder="+998 90 000 00 00"/>
 </div>
 <div>
 <label className="mezon-form-label mezon-form-label--regular">Email</label>
 <Input type="email"{...register(`parents.${index}.email`)} />
 <FormError message={errors.parents?.[index]?.email?.message} />
 </div>
 <div className="sm:col-span-2">
 <label className="mezon-form-label mezon-form-label--regular">Место работы</label>
 <Input {...register(`parents.${index}.workplace`)} />
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
 <label className="mezon-form-label mezon-form-label--regular">№ Договора</label>
 <Input {...register('contractNumber')} />
 </div>
 <div>
 <label className="mezon-form-label mezon-form-label--regular">Дата договора</label>
 <Input type="date"{...register('contractDate')} />
 </div>
 </div>
 </fieldset>

 {/* ===== Секция 4: Мед. сведения ===== */}
 <fieldset className="space-y-4 rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-[rgba(255,255,255,0.72)] p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
 <legend className="px-1 text-[15px] font-semibold tracking-[-0.015em] text-primary">Медицинские сведения</legend>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <label className="mezon-form-label mezon-form-label--regular">Аллергии (через запятую)</label>
 <Input {...register('healthAllergies')} placeholder="молоко, орехи"/>
 </div>
 <div>
 <label className="mezon-form-label mezon-form-label--regular">Особые условия</label>
 <Input {...register('healthConditions')} placeholder="астма, диабет"/>
 </div>
 <div>
 <label className="mezon-form-label mezon-form-label--regular">Медикаменты</label>
 <Input {...register('healthMedications')} placeholder="ингалятор"/>
 </div>
 <div>
 <label className="mezon-form-label mezon-form-label--regular">Примечания</label>
 <Input {...register('healthNotes')} />
 </div>
 </div>
 </fieldset>

 {/* ===== Кнопки ===== */}
 <div className="mezon-modal-inline-actions">
 <Button type="button"variant="ghost"onClick={onCancel}>Отмена</Button>
 <Button type="submit"disabled={isSubmitting}>{isSubmitting ? 'Сохранение...' : 'Сохранить'}</Button>
 </div>
 </form>
 );
}
