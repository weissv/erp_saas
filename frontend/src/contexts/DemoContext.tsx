// src/contexts/DemoContext.tsx
import { createContext, useContext, useMemo, ReactNode } from "react";

export interface DemoContextValue {
  /** True when the app is running in read-only demo mode */
  isDemo: boolean;
}

const DemoContext = createContext<DemoContextValue>({ isDemo: false });

export function DemoProvider({
  isDemo,
  children,
}: {
  isDemo: boolean;
  children: ReactNode;
}) {
  const value = useMemo<DemoContextValue>(() => ({ isDemo }), [isDemo]);
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoContextValue {
  return useContext(DemoContext);
}
