// src/modules/saas/middleware/subscriptionGuard.ts
// Express middleware that enforces subscription lock states.
//
// Soft Lock  → block POST / PUT / PATCH / DELETE (read-only mode)
// Hard Lock  → redirect ALL requests to the billing page

import { Request, Response, NextFunction } from 'express';
import { SUBSCRIPTION_STATUS } from '../constants';

/**
 * The tenant context is expected to be set on req by a prior middleware
 * (e.g. tenant resolution middleware), providing at least the subscription status.
 */
export interface TenantContext {
  tenantId: string;
  subscriptionStatus: string;
}

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
    }
  }
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const BILLING_URL = process.env.BILLING_PAGE_URL || '/billing';

/**
 * Subscription enforcement middleware.
 *
 * Mount this *after* the tenant resolution middleware and *before* the
 * application routes for tenant-scoped APIs.
 */
export function subscriptionGuard(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const tenant = req.tenant;

  // If no tenant context is present, skip (e.g. master-plane routes)
  if (!tenant) {
    next();
    return;
  }

  const { subscriptionStatus } = tenant;

  // Hard Lock – everything is blocked; redirect to billing
  if (subscriptionStatus === SUBSCRIPTION_STATUS.HARD_LOCKED) {
    res.status(402).json({
      error: {
        code: 'SUBSCRIPTION_HARD_LOCKED',
        message:
          'Your subscription is overdue. Please update your billing information to continue.',
        billingUrl: BILLING_URL,
      },
    });
    return;
  }

  // Soft Lock – only block mutating requests
  if (
    subscriptionStatus === SUBSCRIPTION_STATUS.SOFT_LOCKED &&
    MUTATING_METHODS.has(req.method)
  ) {
    res.status(402).json({
      error: {
        code: 'SUBSCRIPTION_SOFT_LOCKED',
        message:
          'Your subscription payment is overdue. Write operations are disabled until payment is received.',
        billingUrl: BILLING_URL,
      },
    });
    return;
  }

  next();
}
