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
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium",
  "transition-all duration-150 ease-out outline-none",
  "disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none",
  "active:scale-[0.99] touch-manipulation",
  "leading-none",
].join(" ");

const variants: Record<ButtonVariant, string> = {
  default: [
    "bg-primary text-primary-foreground shadow-sm",
    "hover:bg-primary/90",
    "focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  ].join(" "),
  outline: [
    "border border-border bg-card text-foreground shadow-sm",
    "hover:bg-accent hover:text-accent-foreground",
    "focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  ].join(" "),
  ghost: [
    "bg-transparent text-primary shadow-none",
    "hover:bg-accent hover:text-accent-foreground",
    "focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  ].join(" "),
  secondary: [
    "bg-secondary text-secondary-foreground shadow-sm",
    "hover:bg-secondary/80",
    "focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  ].join(" "),
  destructive: [
    "bg-destructive text-destructive-foreground shadow-sm",
    "hover:bg-destructive/90",
    "focus-visible:ring-2 focus-visible:ring-destructive/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  ].join(" "),
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 py-2 text-[12px]",
  md: "h-10 px-4 py-2.5 text-[13px]",
  lg: "h-11 px-6 py-3 text-[14px]",
  icon: "h-10 w-10 p-0",
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
