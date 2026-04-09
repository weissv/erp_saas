import { useState, useEffect} from 'react';
import { useForm} from 'react-hook-form';
import { z} from 'zod';
import { zodResolver} from '@hookform/resolvers/zod';
import { toast} from 'sonner';
import { api} from '../../lib/api';
import { Button} from '../ui/button';
import { Input} from '../ui/input';
import { FormError} from '../ui/FormError';
import { User, AvailableEmployee} from '../../types/user';
import { Eye, EyeOff, MessageCircle, ExternalLink} from 'lucide-react';

// Имя бота для Telegram Deep Link (из Vite env переменных)
const TELEGRAM_BOT_NAME = import.meta.env.VITE_TELEGRAM_BOT_NAME || 'mezon_erpbot';

const ROLES = [
 { value: 'DEVELOPER', label: 'Разработчик'},
 { value: 'DIRECTOR', label: 'Директор'},
 { value: 'DEPUTY', label: 'Завуч'},
 { value: 'ADMIN', label: 'Администратор'},
 { value: 'TEACHER', label: 'Учитель'},
 { value: 'ACCOUNTANT', label: 'Бухгалтер'},
 { value: 'ZAVHOZ', label: 'Завхоз'},
] as const;

const createUserSchema = z.object({
 email: z.string().min(3, 'Логин обязателен (минимум 3 символа)'),
 password: z.string().min(8, 'Пароль должен быть минимум 8 символов'),
 role: z.enum(['DEVELOPER', 'DIRECTOR', 'DEPUTY', 'ADMIN', 'TEACHER', 'ACCOUNTANT', 'ZAVHOZ']),
 employeeId: z.coerce.number().positive('Выберите сотрудника'),
});

const updateUserSchema = z.object({
 email: z.string().min(3, 'Логин обязателен (минимум 3 символа)').optional(),
 password: z.string().min(8, 'Пароль должен быть минимум 8 символов').optional().or(z.literal('')),
 role: z.enum(['DEVELOPER', 'DIRECTOR', 'DEPUTY', 'ADMIN', 'TEACHER', 'ACCOUNTANT', 'ZAVHOZ']).optional(),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;
type UpdateUserFormData = z.infer<typeof updateUserSchema>;

type UserFormProps = {
 initialData?: User | null;
 onSuccess: () => void;
 onCancel: () => void;
};

export function UserForm({ initialData, onSuccess, onCancel}: UserFormProps) {
 const isEditing = !!initialData;
 const [showPassword, setShowPassword] = useState(false);
 const [availableEmployees, setAvailableEmployees] = useState<AvailableEmployee[]>([]);
 const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);

 const {
 register,
 handleSubmit,
 formState: { errors, isSubmitting},
 watch,
} = useForm<CreateUserFormData | UpdateUserFormData>({
 resolver: zodResolver(isEditing ? updateUserSchema : createUserSchema),
 defaultValues: isEditing
 ? {
 email: initialData.email,
 password: '',
 role: initialData.role,
}
 : {
 email: '',
 password: '',
 role: 'TEACHER',
 employeeId: undefined,
},
});

 useEffect(() => {
 if (!isEditing) {
 loadAvailableEmployees();
}
}, [isEditing]);

 const loadAvailableEmployees = async () => {
 setIsLoadingEmployees(true);
 try {
 const employees = await api.get('/api/users/employees/available');
 setAvailableEmployees(employees);
} catch (error: any) {
 console.error('Failed to load available employees:', error);
 toast.error('Не удалось загрузить список сотрудников');
} finally {
 setIsLoadingEmployees(false);
}
};

 const onSubmit = async (data: CreateUserFormData | UpdateUserFormData) => {
 try {
 if (isEditing) {
 // For update, only send non-empty fields
 const updatePayload: any = {};
 if (data.email) updatePayload.email = data.email;
 if (data.role) updatePayload.role = data.role;
 if (data.password && data.password.length > 0) updatePayload.password = data.password;
 
 await api.put(`/api/users/${initialData.id}`, updatePayload);
} else {
 await api.post('/api/users', data);
}
 onSuccess();
} catch (error: any) {
 const msg = error?.message || 'Ошибка сохранения';
 toast.error('Ошибка', { description: msg});
}
};

 return (
 <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
 {/* Login/Email */}
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest text-primary mb-1">Логин</label>
 <Input {...register('email')} placeholder="Введите логин для входа"/>
 <FormError message={errors.email?.message} />
 </div>

 {/* Password */}
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest text-primary mb-1">
 Пароль {isEditing && <span className="text-secondary font-normal">(оставьте пустым, чтобы не менять)</span>}
 </label>
 <div className="relative">
 <Input
 type={showPassword ? 'text' : 'password'}
 {...register('password')}
 placeholder={isEditing ? '••••••••' : 'Минимум 8 символов'}
 />
 <button
 type="button"
 className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary"
 onClick={() => setShowPassword(!showPassword)}
 >
 {showPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
 </button>
 </div>
 <FormError message={errors.password?.message} />
 </div>

 {/* Role */}
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest text-primary mb-1">Роль</label>
 <select
 {...register('role')}
 className="w-full px-3 py-2 border border-field rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
 >
 {ROLES.map((role) => (
 <option key={role.value} value={role.value}>
 {role.label}
 </option>
 ))}
 </select>
 <FormError message={errors.role?.message} />
 </div>

 {/* Employee Select - only for new users */}
 {!isEditing && (
 <div>
 <label className="block text-[11px] font-medium uppercase tracking-widest text-primary mb-1">Сотрудник</label>
 {isLoadingEmployees ? (
 <div className="text-sm text-secondary">Загрузка списка сотрудников...</div>
 ) : availableEmployees.length === 0 ? (
 <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
 Нет доступных сотрудников без учётной записи. Сначала добавьте сотрудника в разделе «Сотрудники».
 </div>
 ) : (
 <select
 {...register('employeeId' as any)}
 className="w-full px-3 py-2 border border-field rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
 >
 <option value="">Выберите сотрудника</option>
 {availableEmployees.map((emp) => (
 <option key={emp.id} value={emp.id}>
 {emp.lastName} {emp.firstName} — {emp.position}
 </option>
 ))}
 </select>
 )}
 <FormError message={(errors as any).employeeId?.message} />
 </div>
 )}

 {/* Current Employee Info - for editing */}
 {isEditing && initialData.employee && (
 <div className="bg-fill-quaternary p-3 rounded-md">
 <label className="block text-[11px] font-medium uppercase tracking-widest text-primary mb-1">Привязанный сотрудник</label>
 <p className="text-sm text-secondary">
 {initialData.employee.lastName} {initialData.employee.firstName} — {initialData.employee.position}
 </p>
 </div>
 )}

 {/* Telegram Connect - for editing */}
 {isEditing && (
 <div className="border border-blue-200 bg-blue-50 p-4 rounded-md">
 <label className="block text-[11px] font-medium uppercase tracking-widest text-primary mb-2">
 <MessageCircle className="inline-block w-4 h-4 mr-1 text-blue-500"/>
 Telegram уведомления
 </label>
 {(initialData as any).telegramChatId ? (
 <div className="flex items-center gap-2">
 <span className="text-sm text-macos-green font-medium">✓ Telegram подключён</span>
 </div>
 ) : (
 <div className="space-y-2">
 <p className="text-sm text-secondary">
 Подключите Telegram для получения уведомлений о заявках
 </p>
 <a
 href={`https://t.me/${TELEGRAM_BOT_NAME}?start=${initialData.id}`}
 target="_blank"
 rel="noopener noreferrer"
 className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-[11px] font-medium uppercase tracking-widest rounded-md macos-transition"
 >
 <MessageCircle className="w-4 h-4"/>
 Подключить Telegram
 <ExternalLink className="w-3 h-3"/>
 </a>
 </div>
 )}
 </div>
 )}

 {/* Actions */}
 <div className="flex justify-end gap-2 pt-4">
 <Button type="button"variant="ghost"onClick={onCancel}>
 Отмена
 </Button>
 <Button type="submit"disabled={isSubmitting || (!isEditing && availableEmployees.length === 0)}>
 {isSubmitting ? 'Сохранение...' : isEditing ? 'Сохранить' : 'Создать'}
 </Button>
 </div>
 </form>
 );
}
