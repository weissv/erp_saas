// src/layouts/AuthLayout.tsx
import { Outlet } from "react-router-dom";
import { Toaster } from "sonner";

export default function AuthLayout() {
  return (
    <div className="relative min-h-screen bg-background pb-16 pt-8">
      {/* Subtle gradient orbs */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-24 left-1/4 w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.05),transparent_70%)] blur-3xl" />
        <div className="absolute top-1/3 right-1/5 w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,hsl(var(--chart-4)/0.04),transparent_70%)] blur-3xl" />
      </div>
      <Toaster position="top-right" richColors />
      <Outlet />
    </div>
  );
}
