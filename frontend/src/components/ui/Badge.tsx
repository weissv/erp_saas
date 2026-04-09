// src/components/ui/Badge.tsx
import { HTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

export type BadgeVariant = "default" | "success" | "warning" | "danger" | "neutral" | "outline";

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

const base = "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-pill text-[11px] font-semibold tracking-[0.01em] uppercase leading-relaxed";

const variants: Record<BadgeVariant, string> = {
  default: "bg-tint-blue text-macos-blue",
  success: "bg-tint-green text-[#1B7A3D]",
  warning: "bg-tint-orange text-[#B25E00]",
  danger:  "bg-tint-red text-macos-red",
  neutral: "bg-fill-quaternary text-secondary",
  outline: "border border-separator text-primary bg-surface-primary shadow-subtle",
};

export const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(base, variants[variant], className)}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";
