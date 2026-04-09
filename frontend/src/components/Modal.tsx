// src/components/Modal.tsx
import { ReactNode, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";

type ModalTone = "default" | "info" | "success" | "warning" | "danger";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  eyebrow?: string;
  description?: string;
  icon?: ReactNode;
  meta?: ReactNode;
  footer?: ReactNode;
  tone?: ModalTone;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  hideCloseButton?: boolean;
  frameClassName?: string;
  overlayClassName?: string;
  surfaceClassName?: string;
  bodyClassName?: string;
  contentClassName?: string;
}

interface ModalSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

interface ModalGridProps {
  children: ReactNode;
  className?: string;
  columns?: 2 | 3;
}

interface ModalStatProps {
  label: string;
  value: ReactNode;
  meta?: ReactNode;
  tone?: ModalTone;
  className?: string;
}

interface ModalNoticeProps {
  title?: string;
  children: ReactNode;
  tone?: ModalTone;
  className?: string;
}

interface ModalActionsProps {
  children: ReactNode;
  className?: string;
  align?: "start" | "center" | "end" | "between";
}

const sizeClasses: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
  "2xl": "max-w-6xl",
};

const focusableSelector = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusableElements(container: HTMLElement | null) {
  if (!container) return [];

  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) => !element.hasAttribute("disabled") && element.getClientRects().length > 0,
  );
}

export function ModalSection({
  title,
  description,
  children,
  className,
}: ModalSectionProps) {
  return (
    <section className={clsx("mezon-modal-section", className)}>
      {(title || description) && (
        <div className="mezon-modal-section__header">
          {title ? <h3 className="mezon-modal-section__title">{title}</h3> : null}
          {description ? (
            <p className="mezon-modal-section__description">{description}</p>
          ) : null}
        </div>
      )}
      <div className="mezon-modal-section__content">{children}</div>
    </section>
  );
}

export function ModalGrid({ children, className, columns = 2 }: ModalGridProps) {
  return (
    <div
      className={clsx(
        "mezon-modal-grid",
        columns === 3 && "mezon-modal-grid--three",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ModalStat({
  label,
  value,
  meta,
  tone = "default",
  className,
}: ModalStatProps) {
  return (
    <div className={clsx("mezon-modal-stat", `mezon-modal-stat--${tone}`, className)}>
      <p className="mezon-modal-stat__label">{label}</p>
      <div className="mezon-modal-stat__value">{value}</div>
      {meta ? <div className="mezon-modal-stat__meta">{meta}</div> : null}
    </div>
  );
}

export function ModalNotice({
  title,
  children,
  tone = "info",
  className,
}: ModalNoticeProps) {
  return (
    <div className={clsx("mezon-modal-notice", `mezon-modal-notice--${tone}`, className)}>
      {title ? <p className="mezon-modal-notice__title">{title}</p> : null}
      <div className="mezon-modal-notice__body">{children}</div>
    </div>
  );
}

export function ModalActions({
  children,
  className,
  align = "end",
}: ModalActionsProps) {
  return (
    <div
      className={clsx(
        "mezon-modal-actions",
        align === "start" && "mezon-modal-actions--start",
        align === "center" && "mezon-modal-actions--center",
        align === "between" && "mezon-modal-actions--between",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  eyebrow = "Диалог",
  description,
  icon,
  meta,
  footer,
  tone = "default",
  closeOnBackdrop = true,
  closeOnEscape = true,
  hideCloseButton = false,
  frameClassName,
  overlayClassName,
  surfaceClassName,
  bodyClassName,
  contentClassName,
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const surfaceRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeOnEscape) {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== "Tab") return;

      const focusable = getFocusableElements(surfaceRef.current);

      if (focusable.length === 0) {
        e.preventDefault();
        surfaceRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;

      if (e.shiftKey && activeElement === first) {
        e.preventDefault();
        last.focus();
      }

      if (!e.shiftKey && activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [closeOnEscape, isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusTimeout = window.setTimeout(() => {
      const focusable = getFocusableElements(surfaceRef.current);
      const preferredTarget = focusable.find((element) => element !== closeButtonRef.current);

      (preferredTarget ?? closeButtonRef.current ?? surfaceRef.current)?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusTimeout);
      previousFocusRef.current?.focus();
    };
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="mezon-modal-root" role="presentation">
      <div
        className={clsx("mezon-modal-overlay macos-animate-fade-in", overlayClassName)}
        aria-hidden
        onClick={() => {
          if (closeOnBackdrop) {
            onClose();
          }
        }}
      />

      <div className={clsx("mezon-modal-frame", frameClassName)}>
        <section
          ref={surfaceRef}
          className={clsx(
            "mezon-modal-surface macos-animate-scale-in",
            "w-full",
            sizeClasses[size],
            `mezon-modal-surface--${tone}`,
            surfaceClassName,
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          tabIndex={-1}
        >
          <div className={clsx("mezon-modal-accent", `mezon-modal-accent--${tone}`)} aria-hidden />

          <header className="mezon-modal-header">
            <div className="mezon-modal-header__main">
              {icon ? (
                <div className={clsx("mezon-modal-icon", `mezon-modal-icon--${tone}`)}>
                  {icon}
                </div>
              ) : null}

              <div className="mezon-modal-title">
                <div className="mezon-modal-title__row">
                  {eyebrow ? <p className="mezon-modal-eyebrow">{eyebrow}</p> : null}
                  {meta ? <div className="mezon-modal-meta">{meta}</div> : null}
                </div>

                <h2 id={titleId} className="mezon-modal-heading">
                  {title}
                </h2>

                {description ? (
                  <p id={descriptionId} className="mezon-modal-description">
                    {description}
                  </p>
                ) : null}
              </div>
            </div>

            {!hideCloseButton ? (
              <button
                ref={closeButtonRef}
                onClick={onClose}
                className="mezon-modal-close uppercase-none"
                aria-label="Закрыть"
                type="button"
              >
                <span aria-hidden>&times;</span>
              </button>
            ) : null}
          </header>

          <div className={clsx("mezon-modal-body", bodyClassName)}>
            <div className={clsx("mezon-modal-content", contentClassName)}>{children}</div>
          </div>

          {footer ? <footer className="mezon-modal-footer">{footer}</footer> : null}
        </section>
      </div>
    </div>,
    document.body,
  );
}
