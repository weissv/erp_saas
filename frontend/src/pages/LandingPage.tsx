import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Check, ChevronRight, LogIn, PlayCircle } from "lucide-react";
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
import { getDemoUrl } from "../features/marketing/url";
import { api } from "../lib/api";
import { LoginWorkspaceModal } from "../components/modals/LoginWorkspaceModal";


const MIN_WAITLIST_MESSAGE_LENGTH = 10;
const WAITLIST_FEEDBACK_TYPE = "WAITLIST";
const primaryActionClass =
  "inline-flex items-center justify-center gap-2 rounded-full bg-macos-blue px-6 py-3 text-sm font-semibold text-white shadow-subtle transition hover:bg-macos-blue-hover";
const secondaryActionClass =
  "inline-flex items-center justify-center gap-2 rounded-full border border-card bg-surface-primary px-6 py-3 text-sm font-semibold text-text-primary shadow-subtle transition hover:bg-white";
const tertiaryActionClass =
  "inline-flex items-center justify-center gap-2 rounded-full px-2 py-3 text-sm font-semibold text-macos-blue transition hover:opacity-80";

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
      <span className="mezon-chip text-[11px] font-semibold uppercase tracking-[0.2em] text-macos-blue">
        {badge}
      </span>
      <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-text-primary sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-7 text-text-tertiary sm:text-lg">{description}</p>
    </div>
  );
}

export default function LandingPage() {
  const demoUrl = getDemoUrl();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
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

    if (!schoolName || !contactInfo || message.length < MIN_WAITLIST_MESSAGE_LENGTH) {
      setWaitlistState({
        kind: "error",
        message: "Укажите школу, канал связи и коротко опишите, что резервируем в очереди.",
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
        message: "Школа добавлена в очередь. Мы закрепили слот и отправим следующий шаг по запуску.",
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

  const openLoginModal = () => {
    setIsLoginModalOpen(true);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg-canvas text-text-primary">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(0,122,255,0.14),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,247,255,0.92)_40%,rgba(240,243,250,0.92))]" />
      <div className="absolute left-1/2 top-24 -z-10 h-80 w-80 -translate-x-1/2 rounded-full bg-[rgba(52,199,89,0.14)] blur-3xl" />

      <header className="sticky top-0 z-50 border-b border-card bg-[rgba(246,247,251,0.86)] backdrop-blur-[20px]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
          <div>
            <p className="text-lg font-semibold tracking-[-0.03em] text-text-primary">Mirai Edu</p>
            <p className="text-sm text-text-tertiary">Очередь на запуск, ERP и LMS в одном контуре</p>
          </div>

          <nav className="hidden items-center gap-6 md:flex">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-text-tertiary transition-colors hover:text-text-primary"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <a
              href={demoUrl}
              className={`${secondaryActionClass} hidden px-4 py-2 sm:inline-flex`}
            >
              Демо
            </a>
            <button
              type="button"
              onClick={openLoginModal}
              aria-haspopup="dialog"
              className={`${secondaryActionClass} px-4 py-2`}
            >
              <LogIn className="h-4 w-4" />
              Log in
            </button>
            <a
              href="#waitlist"
              className="inline-flex items-center justify-center rounded-full bg-macos-blue px-4 py-2 text-sm font-medium text-white shadow-subtle transition hover:bg-macos-blue-hover"
            >
              Встать в очередь
            </a>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid max-w-7xl gap-12 px-6 py-16 sm:py-20 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-center lg:py-24">
          <div>
            <span className="mezon-chip text-[11px] font-semibold uppercase tracking-[0.2em] text-macos-blue">
              Mirai Edu · очередь на запуск для школ, академий и учебных центров
            </span>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-text-primary sm:text-5xl lg:text-6xl">
              Встаньте в очередь на запуск школы и получите единый контур ERP + LMS.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-text-tertiary sm:text-xl">
              Mirai Edu ставит школу в очередь на подключение, открывает рабочее демо без страницы
              входа и затем переводит администрацию, педагогов и семьи в единый операционный контур.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href="#waitlist"
                className={primaryActionClass}
              >
                Встать в очередь
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href={demoUrl}
                className={secondaryActionClass}
              >
                <PlayCircle className="h-4 w-4" />
                Открыть демо
              </a>
              <button
                type="button"
                onClick={openLoginModal}
                aria-haspopup="dialog"
                className={secondaryActionClass}
              >
                <LogIn className="h-4 w-4" />
                Log in
              </button>
              <a
                href="#implementation"
                className={tertiaryActionClass}
              >
                <PlayCircle className="h-4 w-4" />
                Как идет запуск
              </a>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {HERO_HIGHLIGHTS.map((item) => (
                <div key={item.title} className="glass-panel p-5">
                  <p className="text-sm font-semibold text-text-primary">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-text-tertiary">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel p-6 sm:p-8">
            <div className="rounded-[1.75rem] border border-[rgba(0,122,255,0.14)] bg-[linear-gradient(135deg,rgba(0,122,255,0.08),rgba(52,199,89,0.05))] p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-macos-blue">
                Операционное ядро школы
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-text-primary">
                Один сценарий для очереди, запуска, ERP и ежедневной LMS-работы.
              </h2>
              <p className="mt-4 text-sm leading-6 text-text-tertiary">
                Вместо разрозненных таблиц, мессенджеров и локальных сервисов команда получает
                один цифровой маршрут: очередь на запуск, рабочее демо и затем стабильную систему.
              </p>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {METRICS.map((metric) => (
                <div key={metric.value} className="rounded-3xl border border-card bg-white/80 p-5 backdrop-blur-[18px]">
                  <p className="text-2xl font-semibold tracking-[-0.03em] text-text-primary">{metric.value}</p>
                  <p className="mt-2 text-sm font-medium text-text-primary">{metric.label}</p>
                  <p className="mt-2 text-sm leading-6 text-text-tertiary">{metric.description}</p>
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
              <article key={title} className="glass-panel p-7">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(0,122,255,0.12)] text-macos-blue">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-text-primary">{title}</h3>
                <p className="mt-3 text-base leading-7 text-text-tertiary">{description}</p>
                <ul className="mt-6 space-y-3">
                  {bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-3 text-sm leading-6 text-text-tertiary">
                      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgba(0,122,255,0.12)] text-macos-blue">
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

        <section className="border-y border-card/80 bg-white/40 py-16 sm:py-20 backdrop-blur-[18px]">
          <div className="mx-auto max-w-7xl px-6">
            <SectionHeading
              badge="Сквозные сценарии"
              title="Не только учеба — вся операционная экосистема школы работает синхронно"
              description="Коммуникации, документы, события и сервисные процессы связаны между собой, поэтому школа управляет операционными задачами без потерь контекста."
            />

            <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {OPERATIONS.map(({ icon: Icon, title, description, bullets }) => (
                <article key={title} className="glass-panel p-6">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(0,122,255,0.12)] text-macos-blue">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-text-primary">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-text-tertiary">{description}</p>
                  <ul className="mt-5 space-y-2.5 text-sm leading-6 text-text-tertiary">
                    {bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2.5">
                        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-macos-blue" />
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
              <article key={title} className="glass-panel p-7">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(0,122,255,0.12)] text-macos-blue">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-text-primary">{title}</h3>
                <p className="mt-3 text-base leading-7 text-text-tertiary">{description}</p>
                <ul className="mt-6 space-y-3 text-sm leading-6 text-text-tertiary">
                  {bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgba(0,122,255,0.12)] text-macos-blue">
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
                <article key={step.title} className="glass-panel p-7">
                  <div className="flex items-center gap-4">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-macos-blue text-sm font-semibold text-white">
                      0{index + 1}
                    </span>
                    <div>
                      <h3 className="text-2xl font-semibold tracking-[-0.03em] text-text-primary">{step.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-text-tertiary">{step.description}</p>
                    </div>
                  </div>
                  <ul className="mt-6 grid gap-3 text-sm leading-6 text-text-tertiary sm:grid-cols-3">
                    {step.bullets.map((bullet) => (
                      <li key={bullet} className="rounded-2xl border border-card bg-white/80 px-4 py-3 backdrop-blur-[18px]">
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>

            <aside className="glass-panel p-7">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-macos-blue">Что получает школа</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-text-primary">
                Платформа даёт управляемость сегодня и запас для роста завтра.
              </h3>
              <p className="mt-4 text-sm leading-6 text-text-tertiary">
                Mirai Edu помогает быстрее запускать процессы, удерживать качество сервиса и выстраивать
                прозрачную цифровую среду для администрации, педагогов, родителей и студентов.
              </p>

              <div className="mt-6 grid gap-4">
                {TRUST_SIGNALS.map(({ icon: Icon, title, description }) => (
                  <div key={title} className="rounded-3xl border border-card bg-white/80 p-5 backdrop-blur-[18px]">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(0,122,255,0.12)] text-macos-blue">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="mt-4 text-base font-semibold text-text-primary">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-text-tertiary">{description}</p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section id="waitlist" className="mx-auto max-w-7xl px-6 pb-16 sm:pb-20">
          <div className="glass-panel overflow-hidden bg-[linear-gradient(135deg,rgba(0,122,255,0.08),rgba(52,199,89,0.08))] p-8 sm:p-10 lg:p-12">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.95fr)] lg:items-start">
              <div>
                <span className="mezon-chip bg-white/90 text-[11px] font-semibold uppercase tracking-[0.2em] text-macos-blue">
                  Очередь на запуск
                </span>
                <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-text-primary sm:text-4xl">
                  Встаньте в очередь на запуск школы в Mirai Edu.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-text-tertiary sm:text-lg">
                  Оставьте школу и канал связи. Мы ставим вас в очередь на запуск, резервируем demo-сценарий
                  и отправляем следующий шаг, чтобы быстро открыть ERP и LMS в одном контуре.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <a
                    href={demoUrl}
                    className={primaryActionClass}
                  >
                    Открыть демо
                    <ArrowRight className="h-4 w-4" />
                  </a>
                  <button
                    type="button"
                    onClick={openLoginModal}
                    aria-haspopup="dialog"
                    className={secondaryActionClass}
                  >
                    <LogIn className="h-4 w-4" />
                    Log in
                  </button>
                </div>
              </div>

              <form
                onSubmit={handleWaitlistSubmit}
                className="rounded-[1.75rem] border border-card bg-white/90 p-6 shadow-subtle backdrop-blur-[18px]"
              >
                <div className="grid gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-text-primary" htmlFor="waitlist-school">
                      Школа
                    </label>
                    <input
                      id="waitlist-school"
                      value={waitlistForm.schoolName}
                      onChange={(event) =>
                        setWaitlistForm((current) => ({ ...current, schoolName: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-card bg-surface-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-macos-blue focus:ring-2 focus:ring-[rgba(0,122,255,0.12)]"
                      placeholder="Например, Mirai Test School"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-text-primary" htmlFor="waitlist-contact">
                      Канал связи
                    </label>
                    <input
                      id="waitlist-contact"
                      value={waitlistForm.contactInfo}
                      onChange={(event) =>
                        setWaitlistForm((current) => ({ ...current, contactInfo: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-card bg-surface-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-macos-blue focus:ring-2 focus:ring-[rgba(0,122,255,0.12)]"
                      placeholder="Email, Telegram или телефон"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-text-primary" htmlFor="waitlist-message">
                      Что резервируем в очереди
                    </label>
                    <textarea
                      id="waitlist-message"
                      value={waitlistForm.message}
                      onChange={(event) =>
                        setWaitlistForm((current) => ({ ...current, message: event.target.value }))
                      }
                      className="min-h-32 w-full rounded-2xl border border-card bg-surface-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-macos-blue focus:ring-2 focus:ring-[rgba(0,122,255,0.12)]"
                      placeholder="Например: нужен запуск школы, demo-проверка и единый контур ERP/LMS для команды."
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingWaitlist}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-macos-blue px-6 py-3 text-sm font-semibold text-white shadow-subtle transition hover:bg-macos-blue-hover disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmittingWaitlist ? "Отправляем..." : "Встать в очередь"}
                </button>

                {waitlistState.kind !== "idle" ? (
                  <p
                    className={`mt-4 text-sm ${
                      waitlistState.kind === "success" ? "text-[var(--macos-blue)]" : "text-destructive"
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
          <div className="glass-panel p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-macos-blue">Единый сценарий</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-text-primary">
                  Визитка, demo, ERP и LMS говорят одним визуальным языком.
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-text-tertiary">
                  Одинаковые токены, одна типографика, общая навигационная логика и единый бренд-контур
                  помогают пользователю бесшовно переходить от витрины к ежедневной работе школы.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  href={demoUrl}
                  className={secondaryActionClass}
                >
                  Демо
                </a>
                <button
                  type="button"
                  onClick={openLoginModal}
                  aria-haspopup="dialog"
                  className={primaryActionClass}
                >
                  Log in
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-card/80 bg-[rgba(246,247,251,0.86)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-sm text-text-tertiary sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Mirai Edu. Цифровая платформа для управления школой.</p>
          <div className="flex flex-wrap items-center gap-4">
            {NAV_ITEMS.map((item) => (
              <a key={item.href} href={item.href} className="transition-colors hover:text-text-primary">
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </footer>

      <LoginWorkspaceModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </div>
  );
}
