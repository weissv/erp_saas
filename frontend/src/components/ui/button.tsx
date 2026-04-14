// src/components/ui/button.tsx
import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/utils";

export type ButtonVariant = "default" | "outline" | "ghost" | "secondary" | "destructive";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const base = [
  "inline-flex items-center justify-center gap-2 font-semibold",
  "transition-all duration-150 ease-out rounded-full outline-none",
  "disabled:opacity-40 disabled:cursor-not-allowed",
  "active:scale-[0.98] touch-manipulation",
  "tracking-[-0.01em] leading-none",
].join(" ");

const variants: Record<ButtonVariant, string> = {
  default: [
    "border border-transparent bg-macos-blue text-white",
    "shadow-[0_14px_32px_rgba(0,122,255,0.24)]",
    "hover:-translate-y-0.5 hover:bg-macos-blue-hover",
    "active:bg-macos-blue-active",
    "focus-visible:ring-2 focus-visible:ring-macos-blue/30",
  ].join(" "),
  outline: [
    "border border-white/80 bg-white/80 text-text-primary backdrop-blur-xl",
    "shadow-subtle",
    "hover:-translate-y-0.5 hover:bg-white",
    "focus-visible:ring-2 focus-visible:ring-macos-blue/30",
  ].join(" "),
  ghost: [
    "text-macos-blue",
    "hover:bg-white/70 hover:text-macos-blue-hover",
    "focus-visible:ring-2 focus-visible:ring-macos-blue/30",
  ].join(" "),
  secondary: [
    "border border-transparent bg-white/60 text-text-primary backdrop-blur-xl",
    "hover:-translate-y-0.5 hover:bg-white/80",
    "focus-visible:ring-2 focus-visible:ring-macos-blue/30",
  ].join(" "),
  destructive: [
    "border border-transparent bg-macos-red text-white",
    "shadow-[0_14px_32px_rgba(255,59,48,0.22)]",
    "hover:-translate-y-0.5 hover:bg-macos-red-hover",
    "active:bg-macos-red-active",
    "focus-visible:ring-2 focus-visible:ring-macos-red/30",
  ].join(" "),
};

const sizes: Record<ButtonSize, string> = {
  sm: "text-[12px] px-3.5 py-2 min-h-[36px]",
  md: "text-[13px] px-4 py-2.5 min-h-[42px]",
  lg: "text-[14px] px-6 py-3 min-h-[48px]",
  icon: "h-9 w-9 p-0 min-h-[44px] min-w-[44px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
