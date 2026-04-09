// src/modules/saas/constants.ts
// SaaS pricing tiers and subscription lifecycle constants

export const PRICING_TIERS = {
  STARTER: 'starter',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
} as const;

export type PricingTier = (typeof PRICING_TIERS)[keyof typeof PRICING_TIERS];

/**
 * Map Stripe Price IDs to internal tier names.
 * Values are read from env vars so that each deployment can configure its own IDs.
 */
export const STRIPE_PRICE_TO_TIER: Record<string, PricingTier> = {
  [process.env.STRIPE_PRICE_STARTER || 'price_starter']: PRICING_TIERS.STARTER,
  [process.env.STRIPE_PRICE_PRO || 'price_pro']: PRICING_TIERS.PRO,
  [process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise']: PRICING_TIERS.ENTERPRISE,
};

/** Subscription lifecycle states */
export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  SOFT_LOCKED: 'soft_locked',
  HARD_LOCKED: 'hard_locked',
  PURGING: 'purging',
  PURGED: 'purged',
} as const;

export type SubscriptionStatus =
  (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];

/** Grace period thresholds (in days) after payment failure */
export const LOCK_THRESHOLDS = {
  /** Block mutating requests (POST/PUT/PATCH/DELETE) */
  SOFT_LOCK_DAYS: 1,
  /** Redirect every request to the billing page */
  HARD_LOCK_DAYS: 14,
  /** Export data → email admin → DROP DATABASE */
  PURGE_DAYS: 60,
} as const;

/** Tenant database name prefix (e.g. tenant_a1b2c3d4) */
export const TENANT_DB_PREFIX = 'tenant_' as const;
