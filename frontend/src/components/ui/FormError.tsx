// src/components/ui/FormError.tsx
export function FormError({ message, id}: { message?: string; id?: string}) {
 if (!message) return null;
 return (
 <p id={id} className="mt-1.5 text-[12px] font-medium text-destructive" role="alert" aria-live="polite">
 {message}
 </p>
 );
}
