import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Check, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTenant } from '../contexts/TenantContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { FormError } from '../components/ui/FormError';

const loginSchema = z.object({
  login: z.string().min(1, 'Логин обязателен'),
  password: z.string().min(1, 'Пароль обязателен'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { tenant } = useTenant();
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
  const trustPoints = [
    { label: 'Единый контур', value: 'ERP + LMS + AI' },
    { label: 'Запуск команд', value: '1 рабочее окно' },
    { label: 'Фокус на UX', value: 'чистая визуальная иерархия' },
  ];

  return (
    <div className="relative mx-auto flex min-h-[85vh] max-w-6xl flex-col justify-center px-4 py-8 sm:px-6">
      <div className="pointer-events-none absolute inset-x-0 top-10 -z-10 mx-auto h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 right-10 -z-10 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />
      <div className="relative grid gap-6 overflow-hidden rounded-[32px] border border-white/70 bg-white/75 p-5 shadow-floating backdrop-blur-xl sm:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10 lg:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.10),transparent_24%)]" />

        {/* Left — Brand */}
        <div className="relative flex flex-col justify-between gap-8">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{tenant.name}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-[11px] font-semibold text-foreground shadow-subtle">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Новый визуальный контур
              </span>
            </div>
            <h1 className="mt-5 text-[28px] lg:text-[34px] font-bold tracking-[-0.03em] text-foreground leading-tight">
              Управляйте школой{' '}
              <span className="bg-gradient-to-r from-primary to-[hsl(280,68%,60%)] bg-clip-text text-transparent">
                эффективно
              </span>
            </h1>
            <p className="mt-3 text-[15px] text-muted-foreground max-w-md leading-relaxed">
              Единая платформа управления: чистые поверхности, продуманная типографика и внимание к каждой детали.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {trustPoints.map((point) => (
              <div key={point.label} className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-subtle backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{point.label}</p>
                <p className="mt-2 text-[15px] font-semibold tracking-[-0.02em] text-foreground">{point.value}</p>
              </div>
            ))}
          </div>
          <ul className="grid gap-3">
            {sellingPoints.map((point, index) => (
              <li key={point} className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-foreground shadow-subtle backdrop-blur-sm">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                </span>
                <span className="flex-1 text-[14px] font-medium tracking-[-0.01em]">{point}</span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">0{index + 1}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right — Login form */}
        <div className="relative rounded-[28px] border border-white/75 bg-slate-50/85 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
          <div className="mb-6 space-y-3 text-center">
            <span className="mx-auto inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Защищённый вход
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.06em] font-bold text-muted-foreground">Вход в ERP</p>
              <p className="mt-1 text-[24px] font-semibold tracking-[-0.03em] text-foreground">Авторизация</p>
              <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
                Войдите в рабочее пространство и продолжите работу без лишнего визуального шума.
              </p>
            </div>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" autoComplete="off">
            <div>
              <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block" htmlFor="login">
                Логин
              </label>
              <Input id="login" type="text" autoComplete="off" aria-describedby={errors.login?.message ? 'login-error' : undefined} {...register('login')} />
              <FormError message={errors.login?.message} id="login-error" />
            </div>
            <div>
              <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block" htmlFor="password">
                Пароль
              </label>
              <div className="relative">
                <Input id="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" aria-describedby={errors.password?.message ? 'password-error' : undefined} {...register('password')} />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <FormError message={errors.password?.message} id="password-error" />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? 'Входим...' : 'Войти'}
            </Button>
          </form>
          <div className="mt-5 flex items-center justify-center gap-2 text-[12px] text-muted-foreground">
            <span>Нужен демо-доступ или запуск школы?</span>
            <span className="font-semibold text-primary">Подключим школу и откроем демо по запросу.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
