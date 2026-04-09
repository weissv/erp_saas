// src/components/ui/FormError.tsx
export function FormError({ message}: { message?: string}) {
 if (!message) return null;
 return (
 <p className="mt-1.5 text-[12px] font-medium text-[#FF3B30]">
 {message}
 </p>
 );
}
