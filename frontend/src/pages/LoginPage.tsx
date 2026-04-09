import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { FormError } from '../components/ui/FormError';

const loginSchema = z.object({
  login: z.string().min(1, 'Логин обязателен'),
  password: z.string().min(1, 'Пароль обязателен'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.login, data.password);
      toast.success('Вход выполнен успешно');
      navigate('/');
    } catch (error: any) {
      const msg = error?.message || 'Неверные учетные данные';
      toast.error('Ошибка входа', { description: msg });
    }
  };

  const sellingPoints = [
    'Цифровые дашборды и аналитика',
    'Контуры питания и закупок',
    'Документооборот и уведомления',
  ];

  return (
    <div className="relative mx-auto flex min-h-[85vh] max-w-5xl flex-col justify-center px-6">
      <div className="relative grid gap-10 rounded-[20px] bg-surface-primary border border-card shadow-floating p-10 lg:grid-cols-2">

        {/* Left — Brand */}
        <div className="relative flex flex-col justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-[0.01em] uppercase bg-tint-blue text-macos-blue">Mezon // inspired.School</span>
            <h1 className="mt-4 text-[28px] lg:text-[34px] font-bold tracking-[-0.03em] text-primary leading-tight">
              Управляйте школой{' '}
              <span className="bg-gradient-to-r from-macos-blue to-macos-purple bg-clip-text text-transparent">
                в стиле Mezon
              </span>
            </h1>
            <p className="mt-3 text-[15px] text-tertiary max-w-md leading-relaxed">
              Админ-панель с эстетикой macOS: чистые поверхности, продуманная типографика и внимание к каждой детали.
            </p>
          </div>
          <ul className="mt-8 space-y-3">
            {sellingPoints.map((point) => (
              <li key={point} className="flex items-center gap-3 text-primary">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-tint-blue text-macos-blue">
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                </span>
                <span className="text-[14px] font-medium tracking-[-0.01em]">{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right — Login form */}
        <div className="relative rounded-xl bg-inset border border-card shadow-subtle p-6">
          <div className="mb-6 text-center">
            <p className="text-[11px] uppercase tracking-[0.06em] font-bold text-tertiary">Вход в ERP</p>
            <p className="text-[20px] font-semibold text-primary tracking-[-0.02em] mt-1">Авторизация</p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" autoComplete="off">
            <div>
              <label className="text-[12px] font-medium text-secondary mb-1.5 block" htmlFor="login">
                Логин
              </label>
              <Input id="login" type="text" autoComplete="off" {...register('login')} />
              <FormError message={errors.login?.message} />
            </div>
            <div>
              <label className="text-[12px] font-medium text-secondary mb-1.5 block" htmlFor="password">
                Пароль
              </label>
              <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
              <FormError message={errors.password?.message} />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? 'Входим...' : 'Войти'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
