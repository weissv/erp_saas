// src/components/ui/FormError.tsx
export function FormError({ message, id }: { message?: string; id?: string }) {
  if (!message) return null;
  return (
    <p
      id={id}
      className="mt-1.5 text-xs font-medium text-destructive transition-opacity duration-150"
      role="alert"
      aria-live="polite"
    >
      {message}
    </p>
  );
}
