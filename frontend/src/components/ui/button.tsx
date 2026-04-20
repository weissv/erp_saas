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
  "disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none",
  "active:scale-[0.98] touch-manipulation",
  "tracking-[-0.01em] leading-none",
].join(" ");

const variants: Record<ButtonVariant, string> = {
  default: [
    "border border-transparent bg-primary text-primary-foreground",
    "shadow-[0_10px_24px_rgba(0,122,255,0.2)]",
    "hover:brightness-110",
    "active:brightness-95",
    "focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  ].join(" "),
  outline: [
    "border border-border bg-card text-foreground",
    "shadow-subtle",
    "hover:bg-accent",
    "focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  ].join(" "),
  ghost: [
    "text-primary",
    "hover:bg-accent hover:text-accent-foreground",
    "focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  ].join(" "),
  secondary: [
    "border border-transparent bg-secondary text-secondary-foreground",
    "hover:bg-secondary/80",
    "focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  ].join(" "),
  destructive: [
    "border border-transparent bg-destructive text-destructive-foreground",
    "shadow-[0_10px_24px_rgba(255,59,48,0.18)]",
    "hover:brightness-110",
    "active:brightness-95",
    "focus-visible:ring-2 focus-visible:ring-destructive/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
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
