import { PropsWithChildren, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import ym, { YMInitializer } from "react-yandex-metrika";

const DEFAULT_METRIKA_ID = 108665432;
const rawMetrikaId = Number(import.meta.env.VITE_YANDEX_METRIKA_ID ?? DEFAULT_METRIKA_ID);

export const YANDEX_METRIKA_ID = Number.isInteger(rawMetrikaId) && rawMetrikaId > 0
  ? rawMetrikaId
  : null;

const METRIKA_OPTIONS = {
  clickmap: true,
  trackLinks: true,
  accurateTrackBounce: true,
  webvisor: true,
  ecommerce: "dataLayer",
};

declare global {
  interface Window {
    __miraiMetrikaInitialized?: boolean;
    dataLayer?: unknown[];
    yandex_metrika_accounts?: number[];
    yandex_metrika_callbacks2?: Array<() => void>;
  }
}

const MAX_METRIKA_RETRIES = 20;
const METRIKA_RETRY_DELAY_MS = 250;

function isMetrikaEnabled(): boolean {
  return YANDEX_METRIKA_ID !== null && typeof window !== "undefined";
}

function isMetrikaReady(): boolean {
  return isMetrikaEnabled() && Array.isArray(window.yandex_metrika_accounts) && Array.isArray(window.yandex_metrika_callbacks2);
}

function runWhenMetrikaReady(action: () => void, attempt = 0) {
  if (!isMetrikaEnabled()) {
    return;
  }

  if (isMetrikaReady()) {
    action();
    return;
  }

  if (attempt >= MAX_METRIKA_RETRIES) {
    return;
  }

  window.setTimeout(() => {
    runWhenMetrikaReady(action, attempt + 1);
  }, METRIKA_RETRY_DELAY_MS);
}

export function trackMetrikaHit(url = window.location.href, title = document.title, referer?: string) {
  if (!isMetrikaEnabled()) {
    return;
  }

  const options = referer ? { title, referer } : { title };
  runWhenMetrikaReady(() => {
    ym("hit", url, options);
  });
}

export function trackMetrikaGoal(goal: string, params?: Record<string, unknown>) {
  if (!isMetrikaEnabled()) {
    return;
  }

  if (params) {
    runWhenMetrikaReady(() => {
      ym("reachGoal", goal, params);
    });
    return;
  }

  runWhenMetrikaReady(() => {
    ym("reachGoal", goal);
  });
}

function MetrikaInitializer() {
  const [shouldMount, setShouldMount] = useState(false);

  useEffect(() => {
    if (!isMetrikaEnabled() || window.__miraiMetrikaInitialized) {
      return;
    }

    window.__miraiMetrikaInitialized = true;
    window.dataLayer = window.dataLayer || [];
    setShouldMount(true);
  }, []);

  if (!shouldMount || YANDEX_METRIKA_ID === null) {
    return null;
  }

  return (
    <div hidden aria-hidden="true">
      <YMInitializer
        accounts={[YANDEX_METRIKA_ID]}
        options={METRIKA_OPTIONS}
        version="2"
        containerElement="span"
      />
    </div>
  );
}

export function MetrikaRoot({ children }: PropsWithChildren) {
  return (
    <>
      <MetrikaInitializer />
      {children}
    </>
  );
}

export function MetrikaRouteTracker() {
  const location = useLocation();
  const previousUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isMetrikaEnabled()) {
      return;
    }

    const currentUrl = window.location.href;

    if (previousUrlRef.current === currentUrl) {
      return;
    }

    trackMetrikaHit(currentUrl, document.title, previousUrlRef.current ?? document.referrer);
    previousUrlRef.current = currentUrl;
  }, [location.hash, location.pathname, location.search]);

  return null;
}