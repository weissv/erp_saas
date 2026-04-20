// src/components/DemoBanner.tsx
// Persistent banner shown while in demo mode
import { useState } from "react";
import { X } from "lucide-react";
import { useDemo } from "../contexts/DemoContext";

export function DemoBanner() {
  const { isDemo } = useDemo();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!isDemo || isDismissed) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-[100] flex items-center justify-center gap-2 bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground"
    >
      <span>🔒 Демо-режим — данные доступны только для просмотра</span>
      <button
        onClick={() => setIsDismissed(true)}
        className="ml-2 inline-flex items-center justify-center rounded-full p-0.5 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Скрыть баннер"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
