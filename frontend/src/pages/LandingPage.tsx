// src/pages/LandingPage.tsx
// Marketing landing page rendered on the apex marketing hostname
import { Check, ArrowRight } from "lucide-react";

const FEATURES = [
  "Цифровые дашборды и аналитика",
  "Контуры питания и закупок",
  "Документооборот и уведомления",
  "LMS и электронный журнал",
  "AI-ассистент для администрации",
  "Многотенантная SaaS-архитектура",
];

/**
 * Returns the demo app URL derived from the current hostname.
 * e.g. mirai-edu.space → demo.mirai-edu.space
 */
function getDemoUrl(): string {
  const host = window.location.hostname.replace(/^www\./, "");
  return `${window.location.protocol}//demo.${host}`;
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold tracking-tight">Mirai&nbsp;Edu</span>
          <nav className="flex items-center gap-4">
            <a
              href={getDemoUrl()}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Демо
            </a>
            <a
              href="mailto:info@mirai-edu.space"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
            >
              Связаться
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
          SaaS для образования
        </span>
        <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Управляйте школой{" "}
          <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            эффективно
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Единая платформа для управления образовательными учреждениями&nbsp;—
          финансы, расписание, питание, LMS и&nbsp;многое другое.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <a
            href={getDemoUrl()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            Попробовать демо <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-4xl px-6 pb-20">
        <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">Возможности</h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <li
              key={f}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
            >
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              </span>
              <span className="text-sm font-medium">{f}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} Mirai&nbsp;Edu. Все права защищены.
      </footer>
    </div>
  );
}
