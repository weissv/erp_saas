// src/modules/saas/middleware/subscriptionGuard.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { subscriptionGuard } from './subscriptionGuard';
import { SUBSCRIPTION_STATUS } from '../constants';

function makeMockReqRes(
  method: string = 'GET',
  tenant?: { tenantId: string; subscriptionStatus: string },
) {
  const req = {
    method,
    tenant,
  } as unknown as Request;

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;

  const next = vi.fn() as NextFunction;

  return { req, res, next };
}

describe('subscriptionGuard middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call next() when no tenant context is present', () => {
    const { req, res, next } = makeMockReqRes('GET');
    subscriptionGuard(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should call next() for active subscription', () => {
    const { req, res, next } = makeMockReqRes('POST', {
      tenantId: 't1',
      subscriptionStatus: SUBSCRIPTION_STATUS.ACTIVE,
    });
    subscriptionGuard(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  // --- Soft Lock ---

  it('should allow GET for soft-locked tenant', () => {
    const { req, res, next } = makeMockReqRes('GET', {
      tenantId: 't1',
      subscriptionStatus: SUBSCRIPTION_STATUS.SOFT_LOCKED,
    });
    subscriptionGuard(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should block POST for soft-locked tenant', () => {
    const { req, res, next } = makeMockReqRes('POST', {
      tenantId: 't1',
      subscriptionStatus: SUBSCRIPTION_STATUS.SOFT_LOCKED,
    });
    subscriptionGuard(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(402);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'SUBSCRIPTION_SOFT_LOCKED',
        }),
      }),
    );
  });

  it('should block PUT for soft-locked tenant', () => {
    const { req, res, next } = makeMockReqRes('PUT', {
      tenantId: 't1',
      subscriptionStatus: SUBSCRIPTION_STATUS.SOFT_LOCKED,
    });
    subscriptionGuard(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(402);
  });

  it('should block PATCH for soft-locked tenant', () => {
    const { req, res, next } = makeMockReqRes('PATCH', {
      tenantId: 't1',
      subscriptionStatus: SUBSCRIPTION_STATUS.SOFT_LOCKED,
    });
    subscriptionGuard(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(402);
  });

  it('should block DELETE for soft-locked tenant', () => {
    const { req, res, next } = makeMockReqRes('DELETE', {
      tenantId: 't1',
      subscriptionStatus: SUBSCRIPTION_STATUS.SOFT_LOCKED,
    });
    subscriptionGuard(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(402);
  });

  // --- Hard Lock ---

  it('should block GET for hard-locked tenant', () => {
    const { req, res, next } = makeMockReqRes('GET', {
      tenantId: 't1',
      subscriptionStatus: SUBSCRIPTION_STATUS.HARD_LOCKED,
    });
    subscriptionGuard(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(402);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'SUBSCRIPTION_HARD_LOCKED',
          billingUrl: expect.any(String),
        }),
      }),
    );
  });

  it('should block POST for hard-locked tenant', () => {
    const { req, res, next } = makeMockReqRes('POST', {
      tenantId: 't1',
      subscriptionStatus: SUBSCRIPTION_STATUS.HARD_LOCKED,
    });
    subscriptionGuard(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(402);
  });

  it('should include billingUrl in hard-lock response', () => {
    const { req, res, next } = makeMockReqRes('GET', {
      tenantId: 't1',
      subscriptionStatus: SUBSCRIPTION_STATUS.HARD_LOCKED,
    });
    subscriptionGuard(req, res, next);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          billingUrl: expect.any(String),
        }),
      }),
    );
  });
});
