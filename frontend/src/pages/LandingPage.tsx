import { FormEvent, MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, Check, ChevronRight, LogIn, Menu, PlayCircle, X } from "lucide-react";
import {
  MARKETING_LANGUAGE_OPTIONS,
  getMarketingContent,
  resolveMarketingLanguage,
} from "../features/marketing/content";
import { getDemoUrl } from "../features/marketing/url";
import { api } from "../lib/api";
import { LoginWorkspaceModal } from "../components/modals/LoginWorkspaceModal";
import { trackMetrikaGoal, trackMetrikaHit } from "../lib/metrika";
import "../i18n";
import { setMarketingLanguage } from "../i18n";

const MIN_WAITLIST_MESSAGE_LENGTH = 10;
const WAITLIST_FEEDBACK_TYPE = "WAITLIST";
const WAITLIST_SUCCESS_PATH = "/waitlist/success";
const primaryActionClass =
  "inline-flex items-center justify-center gap-2 rounded-full bg-macos-blue px-6 py-3 text-sm font-semibold text-white shadow-subtle transition hover:bg-macos-blue-hover";
const secondaryActionClass =
  "inline-flex items-center justify-center gap-2 rounded-full border border-card bg-surface-primary px-6 py-3 text-sm font-semibold text-text-primary shadow-subtle transition hover:bg-white";
const tertiaryActionClass =
  "inline-flex items-center justify-center gap-2 rounded-full px-2 py-3 text-sm font-semibold text-macos-blue transition hover:opacity-80";

function getMarketingViewMode(): "landing" | "success" {
  if (typeof window === "undefined") {
    return "landing";
  }

  return window.location.pathname === WAITLIST_SUCCESS_PATH ? "success" : "landing";
}

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

function BrandMark({ tagline, href = "/" }: { tagline: string; href?: string }) {
  return (
    <a href={href} className="group inline-flex min-w-0 items-center gap-3">
      <span className="inline-flex h-11 min-w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#007AFF,#34C759)] px-3 text-sm font-semibold tracking-[0.18em] text-white shadow-[0_14px_32px_rgba(0,122,255,0.26)]">
        ミライ
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-lg font-semibold tracking-[-0.04em] text-text-primary">Mirai</span>
        <span className="hidden truncate text-xs text-text-tertiary sm:block">{tagline}</span>
      </span>
    </a>
  );
}

export default function LandingPage() {
  const { i18n } = useTranslation();
  const demoUrl = getDemoUrl();
  const language = resolveMarketingLanguage(i18n.resolvedLanguage ?? i18n.language);
  const content = useMemo(() => getMarketingContent(language), [language]);
  const { copy } = content;
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"landing" | "success">(() => getMarketingViewMode());
  const [waitlistForm, setWaitlistForm] = useState({
    schoolName: "",
    contactInfo: "",
    message: "",
  });
  const [isSubmittingWaitlist, setIsSubmittingWaitlist] = useState(false);
  const lastTrackedUrlRef = useRef<string | null>(null);
  const [waitlistState, setWaitlistState] = useState<{
    kind: "idle" | "success" | "error";
    message: string;
  }>({
    kind: "idle",
    message: "",
  });

  useEffect(() => {
    const previousTitle = document.title;
    const previousLanguage = document.documentElement.lang;
    const title =
      viewMode === "success" ? copy.successPage.metadataTitle : copy.metadata.title;
    const description =
      viewMode === "success" ? copy.successPage.metadataDescription : copy.metadata.description;

    document.title = title;
    document.documentElement.lang = language;

    let meta = document.querySelector('meta[name="description"]');
    const previousDescription = meta?.getAttribute("content") ?? "";
    const created = !meta;

    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }

    meta.setAttribute("content", description);

    if (typeof window !== "undefined") {
      const currentUrl = window.location.href;

      if (lastTrackedUrlRef.current !== currentUrl) {
        trackMetrikaHit(currentUrl, title, lastTrackedUrlRef.current ?? document.referrer);
        lastTrackedUrlRef.current = currentUrl;
      }
    }

    return () => {
      document.title = previousTitle;
      document.documentElement.lang = previousLanguage || "ru";
      if (created) {
        meta?.remove();
      } else {
        meta?.setAttribute("content", previousDescription);
      }
    };
  }, [
    copy.metadata.description,
    copy.metadata.title,
    copy.successPage.metadataDescription,
    copy.successPage.metadataTitle,
    language,
    viewMode,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handlePopState = () => {
      setViewMode(getMarketingViewMode());
      setIsMobileNavOpen(false);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleWaitlistSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const schoolName = waitlistForm.schoolName.trim();
    const contactInfo = waitlistForm.contactInfo.trim();
    const message = waitlistForm.message.trim();

    if (!schoolName || !contactInfo || message.length < MIN_WAITLIST_MESSAGE_LENGTH) {
      setWaitlistState({
        kind: "error",
        message: copy.waitlist.validationError,
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
      if (typeof window !== "undefined") {
        window.history.pushState({}, "", WAITLIST_SUCCESS_PATH);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      setViewMode("success");
    } catch (error: any) {
      setWaitlistState({
        kind: "error",
        message: error?.message || copy.waitlist.errorFallback,
      });
    } finally {
      setIsSubmittingWaitlist(false);
    }
  };

  const openLoginModal = () => {
    setIsLoginModalOpen(true);
  };

  const handleDemoClick = () => {
    trackMetrikaGoal("open_demo");
  };

  const handleHomeClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (typeof window === "undefined") {
      return;
    }

    event.preventDefault();
    window.history.pushState({}, "", "/");
    window.scrollTo({ top: 0, behavior: "smooth" });
    setViewMode("landing");
    setIsMobileNavOpen(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg-canvas text-text-primary">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(0,122,255,0.14),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,247,255,0.92)_40%,rgba(240,243,250,0.92))]" />
      <div className="absolute left-1/2 top-24 -z-10 h-80 w-80 -translate-x-1/2 rounded-full bg-[rgba(52,199,89,0.14)] blur-3xl" />

      <header className="sticky top-0 z-50 border-b border-card bg-[rgba(246,247,251,0.86)] backdrop-blur-[20px]">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:grid-cols-[auto_minmax(0,1fr)_auto]">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg p-2 text-text-secondary transition hover:bg-fill-quaternary lg:hidden"
              onClick={() => setIsMobileNavOpen((v) => !v)}
              aria-label="Toggle navigation"
            >
              {isMobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <BrandMark tagline={copy.brandTagline} href={viewMode === "success" ? "/" : "/"} />
          </div>

          <nav
            className="hidden items-center justify-center gap-6 lg:flex"
            aria-label={copy.navigationAriaLabel}
          >
            {content.navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-text-tertiary transition-colors hover:text-text-primary"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center justify-end gap-2 lg:flex-nowrap lg:gap-3">
            <div
              className="inline-flex items-center gap-1 rounded-full border border-card bg-white/80 p-1 shadow-subtle"
              role="group"
              aria-label={copy.languageSwitcherLabel}
            >
              {MARKETING_LANGUAGE_OPTIONS.map((option) => {
                const isActive = option.code === language;
                return (
                  <button
                    key={option.code}
                    type="button"
                    aria-pressed={isActive}
                    title={option.nativeLabel}
                    onClick={() => void setMarketingLanguage(option.code)}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold transition sm:px-3 sm:py-1.5 ${
                      isActive
                        ? "bg-macos-blue text-white shadow-subtle"
                        : "text-text-tertiary hover:bg-surface-primary hover:text-text-primary"
                    }`}
                  >
                    {option.shortLabel}
                  </button>
                );
              })}
            </div>

            <div className="hidden items-center gap-2 md:flex lg:gap-3">
              <a
                href={demoUrl}
                onClick={handleDemoClick}
                className={`${secondaryActionClass} px-4 py-2 whitespace-nowrap`}
              >
                {copy.headerDemoCta}
              </a>
              <button
                type="button"
                onClick={openLoginModal}
                aria-haspopup="dialog"
                className={`${secondaryActionClass} px-4 py-2 whitespace-nowrap`}
              >
                <LogIn className="h-4 w-4" />
                {copy.loginCta}
              </button>
              {viewMode === "landing" ? (
                <a
                  href="#waitlist"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-macos-blue px-4 py-2 text-sm font-semibold text-white shadow-subtle transition hover:bg-macos-blue-hover"
                >
                  {copy.waitlistCta}
                </a>
              ) : (
                <a
                  href="/"
                  onClick={handleHomeClick}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-macos-blue px-4 py-2 text-sm font-semibold text-white shadow-subtle transition hover:bg-macos-blue-hover"
                >
                  {copy.successPage.primaryCta}
                </a>
              )}
            </div>
          </div>
        </div>

        {isMobileNavOpen && (
          <div className="border-t border-card px-4 pb-4 pt-2 lg:hidden">
            <nav className="flex flex-col gap-1" aria-label={copy.navigationAriaLabel}>
              {viewMode === "landing"
                ? content.navItems.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileNavOpen(false)}
                      className="rounded-xl px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-fill-quaternary hover:text-text-primary"
                    >
                      {item.label}
                    </a>
                  ))
                : (
                    <a
                      href="/"
                      onClick={handleHomeClick}
                      className="rounded-xl px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-fill-quaternary hover:text-text-primary"
                    >
                      {copy.successPage.primaryCta}
                    </a>
                  )}
              <div className="mt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    openLoginModal();
                    setIsMobileNavOpen(false);
                  }}
                  aria-haspopup="dialog"
                  className={`${secondaryActionClass} w-full justify-center px-4 py-2`}
                >
                  <LogIn className="h-4 w-4" />
                  {copy.loginCta}
                </button>
                <a
                  href={demoUrl}
                  onClick={() => {
                    handleDemoClick();
                    setIsMobileNavOpen(false);
                  }}
                  className={`${primaryActionClass} w-full justify-center px-4 py-2`}
                >
                  {copy.headerDemoCta}
                </a>
                {viewMode === "landing" ? (
                  <a
                    href="#waitlist"
                    onClick={() => setIsMobileNavOpen(false)}
                    className={`${secondaryActionClass} w-full justify-center px-4 py-2`}
                  >
                    {copy.waitlistCta}
                  </a>
                ) : null}
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="relative z-10">
        {viewMode === "success" ? (
          <section className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-5xl items-center px-4 py-16 sm:px-6 sm:py-20">
            <div className="glass-panel w-full p-8 sm:p-10 lg:p-14">
              <div className="mx-auto max-w-3xl text-center">
                <span className="mezon-chip bg-white/90 text-[11px] font-semibold uppercase tracking-[0.2em] text-macos-blue">
                  {copy.successPage.eyebrow}
                </span>
                <div className="mt-6 flex justify-center">
                  <BrandMark tagline={copy.brandTagline} />
                </div>
                <h1 className="mt-8 text-3xl font-semibold tracking-[-0.05em] text-text-primary sm:text-4xl lg:text-5xl">
                  {copy.successPage.title}
                </h1>
                <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-text-tertiary sm:text-lg">
                  {copy.successPage.description}
                </p>
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                  <a href="/" onClick={handleHomeClick} className={primaryActionClass}>
                    {copy.successPage.primaryCta}
                  </a>
                  <a href={demoUrl} onClick={handleDemoClick} className={secondaryActionClass}>
                    {copy.successPage.secondaryCta}
                  </a>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <>
        <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:gap-12 sm:px-6 sm:py-16 md:py-20 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-center lg:py-24">
          <div>
            <span className="mezon-chip text-[11px] font-semibold uppercase tracking-[0.2em] text-macos-blue">
              {copy.hero.badge}
            </span>
            <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-[-0.05em] text-text-primary sm:mt-6 sm:text-4xl md:text-5xl lg:text-6xl">
              {copy.hero.title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-text-tertiary sm:text-xl">
              {copy.hero.description}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a href="#waitlist" className={primaryActionClass}>
                {copy.waitlistCta}
                <ArrowRight className="h-4 w-4" />
              </a>
              <a href={demoUrl} onClick={handleDemoClick} className={secondaryActionClass}>
                <PlayCircle className="h-4 w-4" />
                {copy.hero.demoCta}
              </a>
              <button
                type="button"
                onClick={openLoginModal}
                aria-haspopup="dialog"
                className={secondaryActionClass}
              >
                <LogIn className="h-4 w-4" />
                {copy.loginCta}
              </button>
              <a href="#implementation" className={tertiaryActionClass}>
                <PlayCircle className="h-4 w-4" />
                {copy.hero.learnMoreCta}
              </a>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {content.heroHighlights.map((item) => (
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
                {copy.heroPanel.eyebrow}
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-text-primary">
                {copy.heroPanel.title}
              </h2>
              <p className="mt-4 text-sm leading-6 text-text-tertiary">{copy.heroPanel.description}</p>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {content.metrics.map((metric) => (
                <div key={metric.value} className="rounded-3xl border border-card bg-white/80 p-5 backdrop-blur-[18px]">
                  <p className="text-2xl font-semibold tracking-[-0.03em] text-text-primary">{metric.value}</p>
                  <p className="mt-2 text-sm font-medium text-text-primary">{metric.label}</p>
                  <p className="mt-2 text-sm leading-6 text-text-tertiary">{metric.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="capabilities" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 md:py-20">
          <SectionHeading
            badge={copy.capabilities.badge}
            title={copy.capabilities.title}
            description={copy.capabilities.description}
          />

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {content.features.map(({ icon: Icon, title, description, bullets }) => (
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

        <section id="ai" className="border-y border-card/80 bg-white/50 py-16 backdrop-blur-[18px] sm:py-20">
          <div className="mx-auto max-w-7xl px-6">
            <SectionHeading
              badge={copy.aiSection.badge}
              title={copy.aiSection.title}
              description={copy.aiSection.description}
            />

            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {content.aiScenarios.map(({ icon: Icon, title, description, bullets }) => (
                <article
                  key={title}
                  className="glass-panel flex h-full flex-col rounded-[2rem] border border-[rgba(0,122,255,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(241,246,255,0.88))] p-7"
                >
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(0,122,255,0.12)] text-macos-blue">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-text-primary">{title}</h3>
                  <p className="mt-3 text-base leading-7 text-text-tertiary">{description}</p>
                  <ul className="mt-6 space-y-3">
                    {bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-3 text-sm leading-6 text-text-tertiary">
                        <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgba(52,199,89,0.12)] text-[#1f9d55]">
                          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                        </span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-card/80 bg-white/40 py-16 sm:py-20 backdrop-blur-[18px]">
          <div className="mx-auto max-w-7xl px-6">
            <SectionHeading
              badge={copy.operations.badge}
              title={copy.operations.title}
              description={copy.operations.description}
            />

            <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {content.operations.map(({ icon: Icon, title, description, bullets }) => (
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

        <section id="audiences" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 md:py-20">
          <SectionHeading
            badge={copy.audiences.badge}
            title={copy.audiences.title}
            description={copy.audiences.description}
          />

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {content.audiences.map(({ icon: Icon, title, description, bullets }) => (
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

        <section id="implementation" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 md:py-20">
          <SectionHeading
            badge={copy.implementation.badge}
            title={copy.implementation.title}
            description={copy.implementation.description}
          />

          <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
            <div className="grid gap-6">
              {content.implementationSteps.map((step, index) => (
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
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-macos-blue">
                {copy.implementationAside.eyebrow}
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-text-primary">
                {copy.implementationAside.title}
              </h3>
              <p className="mt-4 text-sm leading-6 text-text-tertiary">
                {copy.implementationAside.description}
              </p>

              <div className="mt-6 grid gap-4">
                {content.trustSignals.map(({ icon: Icon, title, description }) => (
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

        <section id="waitlist" className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 sm:pb-16 md:pb-20">
          <div className="glass-panel overflow-hidden bg-[linear-gradient(135deg,rgba(0,122,255,0.08),rgba(52,199,89,0.08))] p-8 sm:p-10 lg:p-12">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.95fr)] lg:items-start">
              <div>
                <span className="mezon-chip bg-white/90 text-[11px] font-semibold uppercase tracking-[0.2em] text-macos-blue">
                  {copy.waitlist.badge}
                </span>
                <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-text-primary sm:text-4xl">
                  {copy.waitlist.title}
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-text-tertiary sm:text-lg">
                  {copy.waitlist.description}
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <a href={demoUrl} className={primaryActionClass}>
                    {copy.hero.demoCta}
                    <ArrowRight className="h-4 w-4" />
                  </a>
                  <button
                    type="button"
                    onClick={openLoginModal}
                    aria-haspopup="dialog"
                    className={secondaryActionClass}
                  >
                    <LogIn className="h-4 w-4" />
                    {copy.loginCta}
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
                      {copy.waitlist.schoolLabel}
                    </label>
                    <input
                      id="waitlist-school"
                      value={waitlistForm.schoolName}
                      onChange={(event) =>
                        setWaitlistForm((current) => ({ ...current, schoolName: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-card bg-surface-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-macos-blue focus:ring-2 focus:ring-[rgba(0,122,255,0.12)]"
                      placeholder={copy.waitlist.schoolPlaceholder}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-text-primary" htmlFor="waitlist-contact">
                      {copy.waitlist.contactLabel}
                    </label>
                    <input
                      id="waitlist-contact"
                      value={waitlistForm.contactInfo}
                      onChange={(event) =>
                        setWaitlistForm((current) => ({ ...current, contactInfo: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-card bg-surface-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-macos-blue focus:ring-2 focus:ring-[rgba(0,122,255,0.12)]"
                      placeholder={copy.waitlist.contactPlaceholder}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-text-primary" htmlFor="waitlist-message">
                      {copy.waitlist.messageLabel}
                    </label>
                    <textarea
                      id="waitlist-message"
                      value={waitlistForm.message}
                      onChange={(event) =>
                        setWaitlistForm((current) => ({ ...current, message: event.target.value }))
                      }
                      className="min-h-32 w-full rounded-2xl border border-card bg-surface-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-macos-blue focus:ring-2 focus:ring-[rgba(0,122,255,0.12)]"
                      placeholder={copy.waitlist.messagePlaceholder}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingWaitlist}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-macos-blue px-6 py-3 text-sm font-semibold text-white shadow-subtle transition hover:bg-macos-blue-hover disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmittingWaitlist ? copy.waitlist.submitLoading : copy.waitlist.submitIdle}
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

        </>
        )}
      </main>

      <footer className="border-t border-card/80 bg-[rgba(246,247,251,0.86)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-sm text-text-tertiary sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} Mirai. {copy.footerDescription}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {viewMode === "landing" ? (
              content.navItems.map((item) => (
                <a key={item.href} href={item.href} className="transition-colors hover:text-text-primary">
                  {item.label}
                </a>
              ))
            ) : (
              <a href="/" onClick={handleHomeClick} className="transition-colors hover:text-text-primary">
                {copy.successPage.primaryCta}
              </a>
            )}
          </div>
        </div>
      </footer>

      <LoginWorkspaceModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </div>
  );
}
