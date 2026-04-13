/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_TELEGRAM_BOT_NAME: string;
  /** Comma-separated marketing hostnames for host-based routing */
  readonly VITE_MARKETING_HOSTNAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
