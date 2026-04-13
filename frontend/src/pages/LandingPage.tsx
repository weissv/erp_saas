import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Check, ChevronRight, Mail, PlayCircle } from "lucide-react";
import {
  AUDIENCES,
  FEATURES,
  HERO_HIGHLIGHTS,
  IMPLEMENTATION_STEPS,
  METRICS,
  NAV_ITEMS,
  OPERATIONS,
  TRUST_SIGNALS,
} from "../features/marketing/content";
import { getDemoUrl, getLoginUrl } from "../features/marketing/url";
import { api } from "../lib/api";

function SectionHeading({
  badge,
  title,
  description,
}: {
  badge: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
        {badge}
      </span>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">{description}</p>
    </div>
  );
}

export default function LandingPage() {
const demoUrl = getDemoUrl();
  const loginUrl = getLoginUrl();
  const WAITLIST_FEEDBACK_TYPE = "WAITLIST";
  const [waitlistForm, setWaitlistForm] = useState({
    schoolName: "",
    contactInfo: "",
    message: "",
  });
  const [isSubmittingWaitlist, setIsSubmittingWaitlist] = useState(false);
  const [waitlistState, setWaitlistState] = useState<{
    kind: "idle" | "success" | "error";
    message: string;
  }>({
    kind: "idle",
    message: "",
  });

  useEffect(() => {
    const previousTitle = document.title;
    const title = "Mirai Edu — цифровая платформа для управления школой";
    const description =
      "Mirai Edu объединяет управление школой, финансы, LMS, питание, коммуникации и автоматизацию в единой SaaS-платформе.";

    document.title = title;

    let meta = document.querySelector('meta[name="description"]');
    const previousDescription = meta?.getAttribute("content") ?? "";
    const created = !meta;

    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }

    meta.setAttribute("content", description);

    return () => {
      document.title = previousTitle;
      if (created) {
        meta?.remove();
      } else {
        meta?.setAttribute("content", previousDescription);
      }
    };
  }, []);

  const handleWaitlistSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const schoolName = waitlistForm.schoolName.trim();
    const contactInfo = waitlistForm.contactInfo.trim();
    const message = waitlistForm.message.trim();

    if (!schoolName || !contactInfo || message.length < 10) {
      setWaitlistState({
        kind: "error",
        message: "Заполните школу, контакт и коротко опишите запрос.",
      });
      return;
    }

    setIsSubmittingWaitlist(true);
    setWaitlistState({ kind: "idle", message: "" });

    try {
      await api.post("/api/feedback", {
        parentName: schoolName,
        contactInfo,
        type: WAITLIST_FEEDBACK_TYPE,
        message,
      });

      setWaitlistForm({
        schoolName: "",
        contactInfo: "",
        message: "",
      });
      setWaitlistState({
        kind: "success",
        message: "Заявка отправлена. Мы добавили школу в очередь и свяжемся с вами.",
      });
    } catch (error: any) {
      setWaitlistState({
        kind: "error",
        message: error?.message || "Не удалось отправить заявку. Попробуйте ещё раз.",
      });
    } finally {
      setIsSubmittingWaitlist(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute inset-x-0 top-0 -z-10 h-[32rem] bg-gradient-to-b from-primary/10 via-background to-background" />
      <div className="absolute left-1/2 top-24 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
          <div>
            <p className="text-lg font-semibold tracking-tight">Mirai Edu</p>
            <p className="text-sm text-muted-foreground">ERP и LMS для современной школы</p>
          </div>

          <nav className="hidden items-center gap-6 md:flex">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <a
              href={demoUrl}
              className="hidden rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent sm:inline-flex"
            >
              Демо
            </a>
            <a
              href={loginUrl}
              className="hidden rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent lg:inline-flex"
            >
              Log in
            </a>
            <a
              href="#waitlist"
              className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Встать в очередь
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl gap-12 px-6 py-16 sm:py-20 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-center lg:py-24">
          <div>
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Mirai Edu · SaaS для школ, академий и учебных центров
            </span>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Управляйте школой как современной цифровой организацией.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
              Mirai Edu собирает финансы, академический процесс, сервисные контуры,
              коммуникации и управленческую аналитику в единую платформу — чтобы команда
              школы работала быстрее, прозрачнее и спокойнее.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href={demoUrl}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Открыть демо
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href={loginUrl}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
              >
                <Mail className="h-4 w-4" />
                Log in
              </a>
              <a
                href="#implementation"
                className="inline-flex items-center justify-center gap-2 rounded-full px-2 py-3 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
              >
                <PlayCircle className="h-4 w-4" />
                Как проходит запуск
              </a>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {HERO_HIGHLIGHTS.map((item) => (
                <div key={item.title} className="rounded-3xl border border-border bg-card/80 p-5 shadow-sm">
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-border bg-card/80 p-5 shadow-sm">
              <p className="text-sm font-semibold text-foreground">Тестовая школа для входа: test</p>
              <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center">
                <span className="rounded-full bg-background px-3 py-1.5">URL: test.mirai-edu.space</span>
                <span className="rounded-full bg-background px-3 py-1.5">Логин: admin@test.local</span>
                <span className="rounded-full bg-background px-3 py-1.5">Пароль: change_me_123</span>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-border bg-card/90 p-6 shadow-sm sm:p-8">
            <div className="rounded-[1.75rem] border border-primary/15 bg-primary/5 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                Операционное ядро школы
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                Один продукт для администрации, педагогов, родителей и студентов.
              </h2>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                Вместо набора отдельных таблиц, мессенджеров и локальных сервисов команда
                получает единый сценарий работы от первого контакта до ежедневной учебной рутины.
              </p>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {METRICS.map((metric) => (
                <div key={metric.value} className="rounded-3xl border border-border bg-background p-5">
                  <p className="text-2xl font-semibold tracking-tight text-foreground">{metric.value}</p>
                  <p className="mt-2 text-sm font-medium text-foreground">{metric.label}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{metric.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="capabilities" className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
          <SectionHeading
            badge="Продуктовые направления"
            title="Закрываем ключевые контуры работы образовательного бизнеса"
            description="Mirai Edu помогает управлять филиалами, финансами, учебным процессом и сервисными задачами в одном цифровом контуре без разрозненных инструментов."
          />

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, description, bullets }) => (
              <article key={title} className="rounded-[2rem] border border-border bg-card p-7 shadow-sm">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">{title}</h3>
                <p className="mt-3 text-base leading-7 text-muted-foreground">{description}</p>
                <ul className="mt-6 space-y-3">
                  {bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
                      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                      </span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-border/70 bg-card/40 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-6">
            <SectionHeading
              badge="Сквозные сценарии"
              title="Не только учеба — вся операционная экосистема школы работает синхронно"
              description="Коммуникации, документы, события и сервисные процессы связаны между собой, поэтому школа управляет операционными задачами без потерь контекста."
            />

            <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {OPERATIONS.map(({ icon: Icon, title, description, bullets }) => (
                <article key={title} className="rounded-[1.75rem] border border-border bg-background p-6 shadow-sm">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-xl font-semibold tracking-tight text-foreground">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
                  <ul className="mt-5 space-y-2.5 text-sm leading-6 text-muted-foreground">
                    {bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2.5">
                        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-primary" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="audiences" className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
          <SectionHeading
            badge="Кому подходит"
            title="Роль-ориентированный опыт для всех участников процесса"
            description="Каждая роль видит свой сценарий работы: руководство — показатели и контроль, команда — процессы и расписание, семьи — прозрачный доступ к важной информации."
          />

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {AUDIENCES.map(({ icon: Icon, title, description, bullets }) => (
              <article key={title} className="rounded-[2rem] border border-border bg-card p-7 shadow-sm">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">{title}</h3>
                <p className="mt-3 text-base leading-7 text-muted-foreground">{description}</p>
                <ul className="mt-6 space-y-3 text-sm leading-6 text-muted-foreground">
                  {bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                      </span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section id="implementation" className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
          <SectionHeading
            badge="Запуск и рост"
            title="Как проходит запуск Mirai Edu"
            description="Запуск строится поэтапно: сначала анализируем процессы, затем включаем базовые модули и после этого расширяем платформу под рост школы."
          />

          <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
            <div className="grid gap-6">
              {IMPLEMENTATION_STEPS.map((step, index) => (
                <article key={step.title} className="rounded-[2rem] border border-border bg-card p-7 shadow-sm">
                  <div className="flex items-center gap-4">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                      0{index + 1}
                    </span>
                    <div>
                      <h3 className="text-2xl font-semibold tracking-tight text-foreground">{step.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                  <ul className="mt-6 grid gap-3 text-sm leading-6 text-muted-foreground sm:grid-cols-3">
                    {step.bullets.map((bullet) => (
                      <li key={bullet} className="rounded-2xl border border-border bg-background px-4 py-3">
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>

            <aside className="rounded-[2rem] border border-border bg-card p-7 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Что получает школа</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                Платформа даёт управляемость сегодня и запас для роста завтра.
              </h3>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                Mirai Edu помогает быстрее запускать процессы, удерживать качество сервиса и выстраивать
                прозрачную цифровую среду для администрации, педагогов, родителей и студентов.
              </p>

              <div className="mt-6 grid gap-4">
                {TRUST_SIGNALS.map(({ icon: Icon, title, description }) => (
                  <div key={title} className="rounded-3xl border border-border bg-background p-5">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="mt-4 text-base font-semibold text-foreground">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section id="waitlist" className="mx-auto max-w-7xl px-6 pb-16 sm:pb-20">
          <div className="rounded-[2.25rem] border border-primary/20 bg-primary/10 p-8 sm:p-10 lg:p-12">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.95fr)] lg:items-start">
              <div>
                <span className="inline-flex items-center rounded-full border border-primary/20 bg-background px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  Очередь на запуск
                </span>
                <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  Встаньте в очередь на запуск школы в Mirai Edu.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                  Оставьте школу и контакт — мы зафиксируем заявку, покажем рабочее демо и подскажем,
                  как быстро открыть ERP и LMS в едином контуре.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <a
                    href={demoUrl}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Открыть демо
                    <ArrowRight className="h-4 w-4" />
                  </a>
                  <a
                    href={loginUrl}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
                  >
                    <Mail className="h-4 w-4" />
                    Log in
                  </a>
                </div>
              </div>

              <form
                onSubmit={handleWaitlistSubmit}
                className="rounded-[1.75rem] border border-border bg-background p-6 shadow-sm"
              >
                <div className="grid gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="waitlist-school">
                      Школа
                    </label>
                    <input
                      id="waitlist-school"
                      value={waitlistForm.schoolName}
                      onChange={(event) =>
                        setWaitlistForm((current) => ({ ...current, schoolName: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                      placeholder="Например, Школа Test"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="waitlist-contact">
                      Контакт
                    </label>
                    <input
                      id="waitlist-contact"
                      value={waitlistForm.contactInfo}
                      onChange={(event) =>
                        setWaitlistForm((current) => ({ ...current, contactInfo: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                      placeholder="Email, Telegram или телефон"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="waitlist-message">
                      Что нужно подключить
                    </label>
                    <textarea
                      id="waitlist-message"
                      value={waitlistForm.message}
                      onChange={(event) =>
                        setWaitlistForm((current) => ({ ...current, message: event.target.value }))
                      }
                      className="min-h-32 w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                      placeholder="Например: нужна школа test, доступ в ERP/LMS и рабочее демо."
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingWaitlist}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmittingWaitlist ? "Отправляем..." : "Встать в очередь"}
                </button>

                {waitlistState.kind !== "idle" ? (
                  <p
                    className={`mt-4 text-sm ${
                      waitlistState.kind === "success" ? "text-primary" : "text-destructive"
                    }`}
                  >
                    {waitlistState.message}
                  </p>
                ) : null}
              </form>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-16">
          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Единый сценарий</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                  Визитка, ERP и LMS работают в одном визуальном языке.
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                  Одинаковые токены, одна типографика, общая навигационная логика и единый бренд-контур
                  помогают пользователю бесшовно переходить от витрины к ежедневной работе школы.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  href={demoUrl}
                  className="inline-flex items-center justify-center rounded-full border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
                >
                  Демо
                </a>
                <a
                  href={loginUrl}
                  className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Log in
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/70 bg-background/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Mirai Edu. Цифровая платформа для управления школой.</p>
          <div className="flex flex-wrap items-center gap-4">
            {NAV_ITEMS.map((item) => (
              <a key={item.href} href={item.href} className="transition-colors hover:text-foreground">
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
