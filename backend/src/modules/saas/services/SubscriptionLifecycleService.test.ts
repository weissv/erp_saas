// src/modules/saas/services/SubscriptionLifecycleService.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubscriptionLifecycleService, TenantRecord } from './SubscriptionLifecycleService';
import { SUBSCRIPTION_STATUS, LOCK_THRESHOLDS } from '../constants';

// Mock child_process, fs, archiver, nodemailer
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

vi.mock('fs', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: vi.fn().mockReturnValue(true),
      mkdirSync: vi.fn(),
      unlinkSync: vi.fn(),
      createWriteStream: vi.fn().mockReturnValue({
        on: vi.fn((event: string, cb: () => void) => {
          if (event === 'close') setTimeout(cb, 0);
        }),
      }),
    },
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
    unlinkSync: vi.fn(),
    createWriteStream: vi.fn().mockReturnValue({
      on: vi.fn((event: string, cb: () => void) => {
        if (event === 'close') setTimeout(cb, 0);
      }),
    }),
  };
});

vi.mock('archiver', () => ({
  default: vi.fn().mockReturnValue({
    pipe: vi.fn(),
    file: vi.fn(),
    finalize: vi.fn(),
    on: vi.fn(),
  }),
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn().mockReturnValue({
      sendMail: vi.fn().mockResolvedValue({ messageId: 'test-id' }),
    }),
  },
}));

// Mock prisma
vi.mock('../../../prisma', () => ({
  prisma: {
    $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
    $queryRawUnsafe: vi.fn().mockResolvedValue([]),
  },
}));

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function makeTenant(overrides: Partial<TenantRecord> = {}): TenantRecord {
  return {
    id: 'abc12345',
    databaseName: 'tenant_abc12345',
    databaseUrl: 'postgresql://user:pass@localhost:5432/tenant_abc12345',
    adminEmail: 'admin@example.com',
    status: SUBSCRIPTION_STATUS.ACTIVE,
    unpaidSince: null,
    ...overrides,
  };
}

describe('SubscriptionLifecycleService', () => {
  let service: SubscriptionLifecycleService;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {
      $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
      $queryRawUnsafe: vi.fn().mockResolvedValue([]),
    };

    service = new SubscriptionLifecycleService(mockDb);
  });

  describe('evaluateTenant', () => {
    it('should do nothing if unpaidSince is null', async () => {
      const tenant = makeTenant({ unpaidSince: null });
      await service.evaluateTenant(tenant);
      expect(mockDb.$executeRawUnsafe).not.toHaveBeenCalled();
    });

    it('should soft-lock after SOFT_LOCK_DAYS', async () => {
      const tenant = makeTenant({
        unpaidSince: daysAgo(LOCK_THRESHOLDS.SOFT_LOCK_DAYS),
        status: SUBSCRIPTION_STATUS.ACTIVE,
      });

      await service.evaluateTenant(tenant);

      expect(mockDb.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE "Tenant"'),
        SUBSCRIPTION_STATUS.SOFT_LOCKED,
        tenant.id,
      );
    });

    it('should not re-soft-lock if already soft-locked', async () => {
      const tenant = makeTenant({
        unpaidSince: daysAgo(LOCK_THRESHOLDS.SOFT_LOCK_DAYS + 2),
        status: SUBSCRIPTION_STATUS.SOFT_LOCKED,
      });

      await service.evaluateTenant(tenant);

      // Should not update status again (not hard-lock yet at day 3)
      expect(mockDb.$executeRawUnsafe).not.toHaveBeenCalled();
    });

    it('should hard-lock after HARD_LOCK_DAYS', async () => {
      const tenant = makeTenant({
        unpaidSince: daysAgo(LOCK_THRESHOLDS.HARD_LOCK_DAYS),
        status: SUBSCRIPTION_STATUS.SOFT_LOCKED,
      });

      await service.evaluateTenant(tenant);

      expect(mockDb.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE "Tenant"'),
        SUBSCRIPTION_STATUS.HARD_LOCKED,
        tenant.id,
      );
    });

    it('should not re-hard-lock if already hard-locked', async () => {
      const tenant = makeTenant({
        unpaidSince: daysAgo(LOCK_THRESHOLDS.HARD_LOCK_DAYS + 5),
        status: SUBSCRIPTION_STATUS.HARD_LOCKED,
      });

      // At day 19, still not purge (60 days needed), and already hard-locked
      await service.evaluateTenant(tenant);
      expect(mockDb.$executeRawUnsafe).not.toHaveBeenCalled();
    });
  });

  describe('softLock', () => {
    it('should update tenant status to soft_locked', async () => {
      const tenant = makeTenant();
      await service.softLock(tenant);

      expect(mockDb.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE "Tenant" SET "status"'),
        SUBSCRIPTION_STATUS.SOFT_LOCKED,
        tenant.id,
      );
    });
  });

  describe('hardLock', () => {
    it('should update tenant status to hard_locked', async () => {
      const tenant = makeTenant();
      await service.hardLock(tenant);

      expect(mockDb.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE "Tenant" SET "status"'),
        SUBSCRIPTION_STATUS.HARD_LOCKED,
        tenant.id,
      );
    });
  });

  describe('purge', () => {
    it('should set status to purging, then purged', async () => {
      // Stub the export, email, and drop methods
      vi.spyOn(service, 'exportDatabase').mockResolvedValue('/tmp/export.zip');
      vi.spyOn(service, 'emailExport').mockResolvedValue(undefined);

      const tenant = makeTenant({
        unpaidSince: daysAgo(LOCK_THRESHOLDS.PURGE_DAYS),
        status: SUBSCRIPTION_STATUS.HARD_LOCKED,
      });

      await service.purge(tenant);

      const calls = mockDb.$executeRawUnsafe.mock.calls;

      // First call: set to PURGING
      const purgingCall = calls.find(
        (c: any[]) => c[1] === SUBSCRIPTION_STATUS.PURGING,
      );
      expect(purgingCall).toBeDefined();

      // Should drop the database
      const dropCall = calls.find(
        (c: any[]) => typeof c[0] === 'string' && c[0].includes('DROP DATABASE'),
      );
      expect(dropCall).toBeDefined();

      // Last status call: set to PURGED
      const purgedCall = calls.find(
        (c: any[]) => c[1] === SUBSCRIPTION_STATUS.PURGED,
      );
      expect(purgedCall).toBeDefined();
    });

    it('should revert status if purge fails midway', async () => {
      vi.spyOn(service, 'exportDatabase').mockRejectedValue(
        new Error('pg_dump failed'),
      );

      const tenant = makeTenant({
        status: SUBSCRIPTION_STATUS.HARD_LOCKED,
      });

      await expect(service.purge(tenant)).rejects.toThrow('pg_dump failed');

      // Should revert to HARD_LOCKED
      const revertCall = mockDb.$executeRawUnsafe.mock.calls.find(
        (c: any[]) => c[1] === SUBSCRIPTION_STATUS.HARD_LOCKED,
      );
      expect(revertCall).toBeDefined();
    });
  });

  describe('processAllTenants', () => {
    it('should fetch unpaid tenants and evaluate each', async () => {
      const tenants = [
        makeTenant({
          id: 't1',
          unpaidSince: daysAgo(2),
          status: SUBSCRIPTION_STATUS.ACTIVE,
        }),
        makeTenant({
          id: 't2',
          unpaidSince: daysAgo(20),
          status: SUBSCRIPTION_STATUS.SOFT_LOCKED,
        }),
      ];

      mockDb.$queryRawUnsafe.mockResolvedValue(tenants);

      const evalSpy = vi.spyOn(service, 'evaluateTenant');

      await service.processAllTenants();

      expect(evalSpy).toHaveBeenCalledTimes(2);
      expect(evalSpy).toHaveBeenCalledWith(tenants[0]);
      expect(evalSpy).toHaveBeenCalledWith(tenants[1]);
    });
  });
});
