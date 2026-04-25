// src/layouts/AuthLayout.tsx
import { Outlet } from "react-router-dom";
import { Toaster } from "sonner";

export default function AuthLayout() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[hsl(220,20%,98%)] text-foreground">
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom_right,rgba(255,255,255,0.7),rgba(241,245,249,0.85))]" />
        <div className="absolute -top-32 left-[12%] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.14),transparent_68%)] blur-3xl" />
        <div className="absolute bottom-0 right-[8%] h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(15,23,42,0.08),transparent_72%)] blur-3xl" />
      </div>
      <Toaster position="top-right" richColors />
      <div className="relative">
        <div className="mx-auto flex min-h-screen w-full max-w-[1600px] items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
