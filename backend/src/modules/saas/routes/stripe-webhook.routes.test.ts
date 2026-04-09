// src/modules/saas/routes/stripe-webhook.routes.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Stub env before importing the route
vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fake');
vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test');

import stripeWebhookRoutes, { setStripe, setProvisionerFactory } from './stripe-webhook.routes';

// Create mock functions
const mockProvision = vi.fn().mockResolvedValue({
  tenantId: 'abc12345',
  databaseName: 'tenant_abc12345',
  databaseUrl: 'postgresql://x',
});

const mockConstructEvent = vi.fn();
const mockStripe = {
  webhooks: { constructEvent: mockConstructEvent },
} as any;

function buildApp() {
  const app = express();
  app.use('/webhook', express.raw({ type: 'application/json' }), stripeWebhookRoutes);
  return app;
}

function makeCheckoutSession(overrides: Record<string, any> = {}) {
  return {
    id: 'cs_test_123',
    customer: 'cus_abc',
    subscription: 'sub_xyz',
    customer_details: { email: 'admin@school.com' },
    customer_email: null,
    metadata: { tier: 'pro', organization_name: 'Test School' },
    ...overrides,
  };
}

describe('Stripe Webhook Route', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProvision.mockResolvedValue({
      tenantId: 'abc12345',
      databaseName: 'tenant_abc12345',
      databaseUrl: 'postgresql://x',
    });
    setStripe(mockStripe);
    setProvisionerFactory(() => ({ provision: mockProvision }));
    app = buildApp();
  });

  it('should return 400 if stripe-signature header is missing', async () => {
    const res = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ type: 'checkout.session.completed' }));

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Missing stripe-signature');
  });

  it('should return 400 if signature verification fails', async () => {
    mockConstructEvent.mockImplementationOnce(() => {
      throw new Error('Invalid signature');
    });

    const res = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'bad_sig')
      .send(JSON.stringify({ type: 'test' }));

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Webhook signature verification failed');
  });

  it('should return 200 for non-checkout events', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'invoice.paid',
      data: { object: {} },
    });

    const res = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'valid_sig')
      .send(JSON.stringify({ type: 'invoice.paid' }));

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(mockProvision).not.toHaveBeenCalled();
  });

  it('should provision tenant on checkout.session.completed', async () => {
    const session = makeCheckoutSession();
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: session },
    });

    const res = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'valid_sig')
      .send(JSON.stringify({ type: 'checkout.session.completed' }));

    expect(res.status).toBe(200);
    expect(res.body.tenantId).toBe('abc12345');

    expect(mockProvision).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'admin@school.com',
        stripeCustomerId: 'cus_abc',
        stripeSubscriptionId: 'sub_xyz',
        tier: 'pro',
        organizationName: 'Test School',
      }),
    );
  });

  it('should fallback to customer_email if customer_details.email is missing', async () => {
    const session = makeCheckoutSession({
      customer_details: {},
      customer_email: 'fallback@example.com',
    });
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: session },
    });

    const res = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'valid_sig')
      .send(JSON.stringify({}));

    expect(res.status).toBe(200);
    expect(mockProvision).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'fallback@example.com' }),
    );
  });

  it('should return 400 if no email found', async () => {
    const session = makeCheckoutSession({
      customer_details: {},
      customer_email: null,
    });
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: session },
    });

    const res = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'valid_sig')
      .send(JSON.stringify({}));

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Customer email is required');
  });

  it('should return 500 if provisioning fails', async () => {
    const session = makeCheckoutSession();
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: session },
    });
    mockProvision.mockRejectedValueOnce(new Error('DB create failed'));

    const res = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'valid_sig')
      .send(JSON.stringify({}));

    expect(res.status).toBe(500);
    expect(res.body.error).toContain('Provisioning failed');
  });

  it('should default tier to starter if no tier info present', async () => {
    const session = makeCheckoutSession({ metadata: {} });
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: session },
    });

    const res = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'valid_sig')
      .send(JSON.stringify({}));

    expect(res.status).toBe(200);
    expect(mockProvision).toHaveBeenCalledWith(
      expect.objectContaining({ tier: 'starter' }),
    );
  });
});
