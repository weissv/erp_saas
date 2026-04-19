// src/modules/saas/routes/stripe-webhook.routes.ts
// Stripe webhook endpoint – receives checkout.session.completed events
// and triggers the tenant provisioning pipeline.

import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { TenantProvisioningService, ProvisioningInput } from '../services/TenantProvisioningService';
import { STRIPE_PRICE_TO_TIER, PRICING_TIERS, PricingTier } from '../constants';

const router = Router();
type StripeClient = InstanceType<typeof Stripe>;
type StripeEvent = ReturnType<StripeClient["webhooks"]["constructEvent"]>;

type CheckoutSessionPayload = {
  customer_details?: { email?: string | null } | null;
  customer_email?: string | null;
  customer?: string | { id?: string | null } | null;
  subscription?: string | { id?: string | null } | null;
  metadata?: Record<string, string | undefined> | null;
  line_items?: {
    data?: Array<{
      price?: {
        id?: string | null;
      } | null;
    }>;
  } | null;
};

/** Lazily-initialized Stripe instance */
let _stripe: StripeClient | undefined;

export function getStripe(): StripeClient {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    _stripe = new Stripe(key, { apiVersion: '2026-03-25.dahlia' });
  }
  return _stripe;
}

/** Allow tests to inject a mock Stripe instance */
export function setStripe(instance: StripeClient): void {
  _stripe = instance;
}

/** Reset for tests */
export function resetStripe(): void {
  _stripe = undefined;
}

/** Provisioner factory – can be overridden in tests */
let _provisionerFactory: () => { provision(input: ProvisioningInput): Promise<any> } = () =>
  new TenantProvisioningService();

/** Allow tests to inject a mock provisioner */
export function setProvisionerFactory(
  factory: () => { provision(input: ProvisioningInput): Promise<any> },
): void {
  _provisionerFactory = factory;
}

/**
 * POST /api/webhooks/stripe
 *
 * Stripe sends raw body (not JSON-parsed), so the route must be mounted
 * *before* the express.json() middleware, or with a separate raw-body parser.
 *
 * This handler:
 *   1. Verifies the webhook signature
 *   2. Extracts customer email, subscription, price → tier
 *   3. Delegates to TenantProvisioningService
 */
router.post('/', async (req: Request, res: Response) => {
  const stripe = getStripe();
  const sig = req.headers['stripe-signature'] as string | undefined;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  if (!sig) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  let event: StripeEvent;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[StripeWebhook] Signature verification failed: ${message}`);
    return res.status(400).json({ error: `Webhook signature verification failed` });
  }

  // We only care about checkout.session.completed for provisioning
  if (event.type !== 'checkout.session.completed') {
    // Acknowledge other events gracefully
    return res.status(200).json({ received: true });
  }

  const session = event.data.object as CheckoutSessionPayload;

  try {
    const email = session.customer_details?.email || session.customer_email;
    if (!email) {
      console.error('[StripeWebhook] No customer email found in session');
      return res.status(400).json({ error: 'Customer email is required' });
    }

    const stripeCustomerId =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id || '';

    const stripeSubscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id || '';

    // Resolve tier from the line items price ID
    const tier = resolveTier(session);

    const provisioner = _provisionerFactory();
    const result = await provisioner.provision({
      email,
      stripeCustomerId,
      stripeSubscriptionId,
      tier,
      organizationName: session.metadata?.organization_name,
    });

    console.log(
      `[StripeWebhook] Tenant provisioned: ${result.tenantId} (${tier}) for ${email}`,
    );

    return res.status(200).json({ received: true, tenantId: result.tenantId });
  } catch (err) {
    console.error('[StripeWebhook] Provisioning failed:', err);
    // Return 500 so Stripe retries the webhook
    return res.status(500).json({ error: 'Provisioning failed' });
  }
});

/**
 * Determine the pricing tier from the checkout session.
 * Tries line_items first, then falls back to metadata, then defaults to STARTER.
 */
function resolveTier(session: CheckoutSessionPayload): PricingTier {
  // Check line items (if expanded)
  const lineItems = (session as any).line_items?.data;
  if (Array.isArray(lineItems)) {
    for (const item of lineItems) {
      const priceId = item.price?.id;
      if (priceId && priceId in STRIPE_PRICE_TO_TIER) {
        return STRIPE_PRICE_TO_TIER[priceId];
      }
    }
  }

  // Check session metadata
  const metaTier = session.metadata?.tier as PricingTier | undefined;
  if (
    metaTier &&
    Object.values(PRICING_TIERS).includes(metaTier)
  ) {
    return metaTier;
  }

  // Default to starter
  return PRICING_TIERS.STARTER;
}

export default router;
