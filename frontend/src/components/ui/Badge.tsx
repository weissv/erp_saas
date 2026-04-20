// src/components/ui/Badge.tsx
import { HTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/utils";

export type BadgeVariant = "default" | "success" | "warning" | "danger" | "neutral" | "outline";
export type BadgeSize = "sm" | "md";

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
}

const sizeClasses: Record<BadgeSize, string> = {
  sm: "px-1.5 py-px text-[10px]",
  md: "px-2 py-0.5 text-[11px]",
};

const base = "inline-flex items-center gap-1.5 rounded-pill font-semibold tracking-[0.01em] uppercase leading-relaxed";

const variants: Record<BadgeVariant, string> = {
  default: "bg-tint-blue text-macos-blue",
  success: "bg-tint-green text-macos-green",
  warning: "bg-tint-orange text-macos-orange",
  danger:  "bg-tint-red text-macos-red",
  neutral: "bg-fill-quaternary text-secondary",
  outline: "border border-separator text-primary bg-surface-primary shadow-subtle",
};

export const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(base, sizeClasses[size], variants[variant], className)}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";
