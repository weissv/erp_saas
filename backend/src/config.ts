// src/config.ts
const defaultOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
];

const resolveOrigins = () => {
  const raw = process.env.CORS_ORIGINS;
  if (!raw) return defaultOrigins;
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  jwtSecret: process.env.JWT_SECRET || "",
  jwtExpiresIn: "12h",
  nodeEnv: process.env.NODE_ENV || "development",
  corsOrigins: resolveOrigins(),

  // Stripe
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",

  // SMTP (for tenant data export emails)
  smtpHost: process.env.SMTP_HOST || "localhost",
  smtpPort: parseInt(process.env.SMTP_PORT || "587", 10),
  smtpSecure: process.env.SMTP_SECURE === "true",
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || "noreply@erp-saas.com",

  // ── Multi-tenant / Control Plane ──────────────────────────────────
  /** Connection string for the Control Plane (master) database. */
  masterDatabaseUrl: process.env.MASTER_DATABASE_URL || "",
  /** Base domain used to extract tenant subdomains (e.g. "mezon.app"). */
  baseDomain: process.env.BASE_DOMAIN || "mezon.app",
  // Groq API для AI проверки контрольных
  groqApiKey: process.env.GROQ_API_KEY || "",
  groqModel: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  groqBlitzModel: process.env.GROQ_BLITZ_MODEL || "llama-3.1-8b-instant",
  groqHeavyModel: process.env.GROQ_HEAVY_MODEL || "openai/gpt-oss-120b",
  // Базовый URL для публичных ссылок на контрольные
  publicExamBaseUrl: process.env.PUBLIC_EXAM_BASE_URL || "http://localhost:5173/exam",

  // Master encryption key for AES-256-GCM (BYOK tenant API keys)
  encryptionKey: process.env.ENCRYPTION_KEY || "",

  // 1C OData Integration
  oneCBaseUrl: process.env.ONEC_BASE_URL || "",
  oneCUser: process.env.ONEC_USER || "",
  oneCPassword: process.env.ONEC_PASSWORD || "",
  oneCTimeoutMs: parseInt(process.env.ONEC_TIMEOUT_MS || "60000", 10),
  oneCCronSchedule: process.env.ONEC_CRON_SCHEDULE || "*/15 * * * *",
} as const;

/**
 * Validate critical configuration on startup.
 * Throws if JWT_SECRET is missing / empty in production.
 * Logs a warning in development so the app still boots for local dev.
 */
export function validateConfig(): void {
  if (!config.jwtSecret) {
    if (config.nodeEnv === "production") {
      throw new Error("JWT_SECRET environment variable is required in production");
    }
    // NOTE: console.warn is intentional here — the structured logger imports
    // config, so using it here would create a circular dependency.
    console.warn("[config] WARNING: JWT_SECRET is not set — tokens will be insecure");
  }
}
