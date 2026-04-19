declare module "react-yandex-metrika" {
  import type { ComponentType, ReactNode } from "react";

  export interface YMInitializerProps {
    accounts: number[];
    options?: Record<string, unknown>;
    version?: "1" | "2";
    containerElement?: string;
    attrs?: Record<string, string>;
    children?: ReactNode;
  }

  export const YMInitializer: ComponentType<YMInitializerProps>;
  export function withId(counterId: number): (...args: unknown[]) => void;
  export function withFilter(filter: (id: number) => boolean): (...args: unknown[]) => void;

  const ym: (...args: unknown[]) => void;
  export default ym;
}