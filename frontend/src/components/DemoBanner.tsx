// src/components/DemoBanner.tsx
// Persistent banner shown while in demo mode
import { useDemo } from "../contexts/DemoContext";

export function DemoBanner() {
  const { isDemo } = useDemo();
  if (!isDemo) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-[100] flex items-center justify-center gap-2 bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground"
    >
      <span>🔒 Демо-режим — данные доступны только для просмотра</span>
    </div>
  );
}
