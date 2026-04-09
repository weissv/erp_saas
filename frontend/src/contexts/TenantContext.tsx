// src/contexts/TenantContext.tsx
import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from "react";
import { api } from "../lib/api";

export interface TenantSettings {
  name: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  supportEmail: string;
  supportPhone: string;
}

interface TenantContextValue {
  tenant: TenantSettings;
  isLoading: boolean;
}

const DEFAULT_TENANT: TenantSettings = {
  name: "ERP Platform",
  logoUrl: "/logo.png",
  faviconUrl: "/favicon.ico",
  primaryColor: "#007AFF",
  supportEmail: "",
  supportPhone: "",
};

const TenantContext = createContext<TenantContextValue>({
  tenant: DEFAULT_TENANT,
  isLoading: true,
});

/**
 * Apply tenant branding to CSS custom-properties on :root so every
 * component that uses the design-token system picks up the tenant color
 * automatically. Also sets document.title and the favicon link element.
 */
function applyBranding(settings: TenantSettings) {
  const root = document.documentElement;
  root.style.setProperty("--primary-color", settings.primaryColor);

  // Derive an 8 % tint of the primary colour for backgrounds
  root.style.setProperty(
    "--primary-tint",
    `${settings.primaryColor}14` // hex + ~8 % alpha
  );

  // Override the macOS-blue token so existing components pick it up
  root.style.setProperty("--color-blue", settings.primaryColor);

  // Document title
  document.title = settings.name;

  // Favicon
  const existingFavicon = document.querySelector<HTMLLinkElement>(
    'link[rel="icon"]'
  );
  if (existingFavicon) {
    existingFavicon.href = settings.faviconUrl;
  }
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<TenantSettings>(DEFAULT_TENANT);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data: TenantSettings = await api.get("/api/tenant/settings");
        if (!cancelled && data) {
          setTenant(data);
          applyBranding(data);
        }
      } catch (err) {
        // Non-fatal — fall back to defaults
        console.warn("[Tenant] Failed to load tenant settings, using defaults:", err);
        applyBranding(DEFAULT_TENANT);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<TenantContextValue>(
    () => ({ tenant, isLoading }),
    [tenant, isLoading]
  );

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}

export function useTenant(): TenantContextValue {
  return useContext(TenantContext);
}
