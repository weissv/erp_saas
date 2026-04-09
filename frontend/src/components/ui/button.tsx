// src/components/ui/button.tsx
import { ButtonHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

export type ButtonVariant = "default" | "outline" | "ghost" | "secondary" | "destructive";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const base = [
  "inline-flex items-center justify-center gap-2 font-medium",
  "macos-transition rounded-[8px] outline-none",
  "disabled:opacity-40 disabled:cursor-not-allowed",
  "active:scale-[0.97] touch-manipulation",
  "tracking-[-0.01em] leading-none",
].join(" ");

const variants: Record<ButtonVariant, string> = {
  default: [
    "bg-macos-blue text-white",
    "shadow-subtle",
    "hover:bg-macos-blue-hover",
    "active:bg-macos-blue-active",
    "focus-visible:ring-2 focus-visible:ring-macos-blue/50",
  ].join(" "),
  outline: [
    "bg-surface-primary text-text-primary",
    "border border-separator",
    "shadow-subtle",
    "hover:bg-fill-quaternary hover:border-border-card",
    "focus-visible:ring-2 focus-visible:ring-macos-blue/50",
  ].join(" "),
  ghost: [
    "text-macos-blue",
    "hover:bg-fill-quaternary hover:text-macos-blue-hover",
    "focus-visible:ring-2 focus-visible:ring-macos-blue/50",
  ].join(" "),
  secondary: [
    "bg-fill-tertiary text-text-primary",
    "hover:bg-fill-secondary",
    "focus-visible:ring-2 focus-visible:ring-macos-blue/50",
  ].join(" "),
  destructive: [
    "bg-macos-red text-white",
    "shadow-subtle",
    "hover:bg-macos-red-hover",
    "active:bg-macos-red-active",
    "focus-visible:ring-2 focus-visible:ring-macos-red/50",
  ].join(" "),
};

const sizes: Record<ButtonSize, string> = {
  sm: "text-[12px] px-2.5 py-1 min-h-[28px]",
  md: "text-[13px] px-3.5 py-1.5 min-h-[32px]",
  lg: "text-[14px] px-5 py-2 min-h-[36px]",
  icon: "h-8 w-8 px-0",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(base, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
