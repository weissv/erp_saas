// src/components/ui/input.tsx
import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const inputBaseClassName = [
  "mezon-field",
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm",
  "transition-colors duration-150",
  "placeholder:text-muted-foreground",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  "disabled:cursor-not-allowed disabled:opacity-50",
  "file:border-0 file:bg-transparent file:text-sm file:font-medium",
].join(" ");

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, error, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          inputBaseClassName,
          error && "border-destructive focus-visible:ring-destructive/30",
          className
        )}
        aria-invalid={error || undefined}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
