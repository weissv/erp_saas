import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { FormError } from '../ui/FormError';

const formSchema = z.object({
  firstName: z.string().min(2, 'Имя обязательно'),
  lastName: z.string().min(2, 'Фамилия обязательна'),
  birthDate: z.string().optional(),
  position: z.string().min(2, 'Должность обязательна'),
  rate: z.coerce.number().positive('Ставка должна быть > 0'),
  hireDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Неверная дата'),
});

type EmployeeFormData = z.infer<typeof formSchema>;
type Employee = {
  id: number;
  firstName: string;
  lastName: string;
  birthDate?: string;
  position: string;
  rate: number;
  hireDate: string;
};
type EmployeeFormProps = {
  initialData?: Employee | null;
  onSuccess: () => void;
  onCancel: () => void;
};

export function EmployeeForm({ initialData, onSuccess, onCancel }: EmployeeFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: initialData?.firstName || '',
      lastName: initialData?.lastName || '',
      birthDate: initialData?.birthDate
        ? new Date(initialData.birthDate).toISOString().split('T')[0]
        : '',
      position: initialData?.position || '',
      rate: initialData?.rate || 1,
      hireDate: initialData
        ? new Date(initialData.hireDate).toISOString().split('T')[0]
        : '',
    },
  });

  const onSubmit = async (data: EmployeeFormData) => {
    try {
      const payload = {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate).toISOString() : null,
        hireDate: new Date(data.hireDate).toISOString(),
      };
      if (initialData) {
        await api.put(`/api/employees/${initialData.id}`, payload);
      } else {
        await api.post('/api/employees', payload);
      }
      onSuccess();
    } catch (error: any) {
      const msg = error?.message || 'Ошибка сохранения';
      toast.error('Ошибка', { description: msg });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label
          htmlFor="emp-firstName"
          className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1"
        >
          Имя *
        </label>
        <Input
          id="emp-firstName"
          {...register('firstName')}
          placeholder="Введите имя"
          error={!!errors.firstName}
          aria-describedby={errors.firstName ? 'emp-firstName-error' : undefined}
        />
        <FormError message={errors.firstName?.message} id="emp-firstName-error" />
      </div>

      <div>
        <label
          htmlFor="emp-lastName"
          className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1"
        >
          Фамилия *
        </label>
        <Input
          id="emp-lastName"
          {...register('lastName')}
          placeholder="Введите фамилию"
          error={!!errors.lastName}
          aria-describedby={errors.lastName ? 'emp-lastName-error' : undefined}
        />
        <FormError message={errors.lastName?.message} id="emp-lastName-error" />
      </div>

      <div>
        <label
          htmlFor="emp-birthDate"
          className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1"
        >
          Дата рождения
        </label>
        <Input
          id="emp-birthDate"
          type="date"
          {...register('birthDate')}
          error={!!errors.birthDate}
          aria-describedby={errors.birthDate ? 'emp-birthDate-error' : undefined}
        />
        <FormError message={errors.birthDate?.message} id="emp-birthDate-error" />
      </div>

      <div>
        <label
          htmlFor="emp-position"
          className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1"
        >
          Должность *
        </label>
        <Input
          id="emp-position"
          {...register('position')}
          placeholder="Например: Учитель"
          error={!!errors.position}
          aria-describedby={errors.position ? 'emp-position-error' : undefined}
        />
        <FormError message={errors.position?.message} id="emp-position-error" />
      </div>

      <div>
        <label
          htmlFor="emp-rate"
          className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1"
        >
          Ставка *
        </label>
        <Input
          id="emp-rate"
          type="number"
          step="0.1"
          {...register('rate')}
          placeholder="1.0"
          error={!!errors.rate}
          aria-describedby={errors.rate ? 'emp-rate-error' : undefined}
        />
        <FormError message={errors.rate?.message} id="emp-rate-error" />
      </div>

      <div>
        <label
          htmlFor="emp-hireDate"
          className="block text-xs font-medium uppercase tracking-widest text-text-primary mb-1"
        >
          Дата приёма *
        </label>
        <Input
          id="emp-hireDate"
          type="date"
          {...register('hireDate')}
          error={!!errors.hireDate}
          aria-describedby={errors.hireDate ? 'emp-hireDate-error' : undefined}
        />
        <FormError message={errors.hireDate?.message} id="emp-hireDate-error" />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Отмена
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </div>
    </form>
  );
}