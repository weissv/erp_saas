// src/modules/saas/services/TenantProvisioningService.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  TenantProvisioningService,
  generateDatabaseName,
  buildTenantDatabaseUrl,
  TenantPrismaFactory,
} from './TenantProvisioningService';

// Mock child_process
vi.mock('child_process', () => ({
  execFile: vi.fn((_file, _args, _options, callback) => callback(null, '', '')),
}));

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn().mockResolvedValue('hashed_password') },
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: class PrismaClient {},
}));

// Mock prisma (master DB) – not used directly since we inject mockMasterDb
vi.mock('../../../prisma', () => ({
  prisma: {
    $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
    $queryRawUnsafe: vi.fn().mockResolvedValue([]),
  },
}));

describe('TenantProvisioningService', () => {
  let service: TenantProvisioningService;
  let mockMasterDb: any;
  let mockTenantDisconnect: ReturnType<typeof vi.fn>;
  let mockTenantEmployeeCreate: ReturnType<typeof vi.fn>;
  let mockTenantUserCreate: ReturnType<typeof vi.fn>;
  let mockTenantPrismaFactory: TenantPrismaFactory;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@localhost:5432/master_db?schema=public');

    mockMasterDb = {
      $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
      $queryRawUnsafe: vi.fn().mockResolvedValue([]),
    };

    mockTenantDisconnect = vi.fn().mockResolvedValue(undefined);
    mockTenantEmployeeCreate = vi.fn().mockResolvedValue({ id: 1 });
    mockTenantUserCreate = vi.fn().mockResolvedValue({ id: 1 });

    mockTenantPrismaFactory = vi.fn().mockReturnValue({
      employee: { create: mockTenantEmployeeCreate },
      user: { create: mockTenantUserCreate },
      $disconnect: mockTenantDisconnect,
    }) as unknown as TenantPrismaFactory;

    service = new TenantProvisioningService(mockMasterDb, mockTenantPrismaFactory);
  });

  describe('generateDatabaseName', () => {
    it('should generate a name with the tenant_ prefix', () => {
      const name = generateDatabaseName();
      expect(name).toMatch(/^tenant_[a-f0-9]{8}$/);
    });

    it('should generate unique names', () => {
      const names = new Set(Array.from({ length: 100 }, () => generateDatabaseName()));
      expect(names.size).toBe(100);
    });
  });

  describe('buildTenantDatabaseUrl', () => {
    it('should replace the database name in the master URL', () => {
      vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@localhost:5432/master_db?schema=public');
      const url = buildTenantDatabaseUrl('tenant_abc12345');
      expect(url).toContain('/tenant_abc12345');
      expect(url).toContain('user:pass@localhost:5432');
      expect(url).not.toContain('schema=public');
    });

    it('should preserve host and credentials', () => {
      vi.stubEnv('DATABASE_URL', 'postgresql://admin:secret@db.example.com:5433/prod?schema=public');
      const url = buildTenantDatabaseUrl('tenant_test1234');
      expect(url).toContain('admin:secret@db.example.com:5433');
      expect(url).toContain('/tenant_test1234');
    });
  });

  describe('createDatabase', () => {
    it('should execute CREATE DATABASE', async () => {
      await service.createDatabase('tenant_abc12345');
      expect(mockMasterDb.$executeRawUnsafe).toHaveBeenCalledWith(
        'CREATE DATABASE "tenant_abc12345"',
      );
    });

    it('should reject invalid database names', async () => {
      await expect(service.createDatabase('DROP TABLE;--')).rejects.toThrow(
        'Invalid database name',
      );
    });

    it('should reject names with special characters', async () => {
      await expect(service.createDatabase('tenant-abc')).rejects.toThrow(
        'Invalid database name',
      );
    });

    it('should accept valid lowercase names with underscores and digits', async () => {
      await expect(service.createDatabase('tenant_abc123')).resolves.toBeUndefined();
    });
  });

  describe('runMigrations', () => {
    it('should call npx prisma migrate deploy with correct DATABASE_URL', async () => {
      const { execFile } = await import('child_process');
      const dbUrl = 'postgresql://user:pass@localhost:5432/tenant_abc12345';

      await service.runMigrations(dbUrl);

      expect(execFile).toHaveBeenCalledWith(
        expect.stringMatching(/npx(\.cmd)?$/),
        expect.arrayContaining([
          'prisma',
          'migrate',
          'deploy',
          expect.stringContaining('--schema='),
        ]),
        expect.objectContaining({
          env: expect.objectContaining({ DATABASE_URL: dbUrl }),
          timeout: 120_000,
          maxBuffer: 10 * 1024 * 1024,
          windowsHide: true,
        }),
        expect.any(Function),
      );
    });
  });

  describe('seedSuperAdmin', () => {
    it('should create an employee and user in the tenant database', async () => {
      const dbUrl = 'postgresql://user:pass@localhost:5432/tenant_abc12345';
      await service.seedSuperAdmin(dbUrl, 'admin@example.com');

      expect(mockTenantEmployeeCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          firstName: 'Super',
          lastName: 'Admin',
          position: 'Administrator',
          rate: 1,
        }),
      });

      expect(mockTenantUserCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'admin@example.com',
          role: 'DEVELOPER',
          employeeId: 1,
        }),
      });
    });

    it('should disconnect the tenant prisma client even on failure', async () => {
      mockTenantEmployeeCreate.mockRejectedValueOnce(new Error('DB error'));

      await expect(
        service.seedSuperAdmin('postgresql://x', 'test@example.com'),
      ).rejects.toThrow('DB error');

      expect(mockTenantDisconnect).toHaveBeenCalled();
    });
  });

  describe('provision (full pipeline)', () => {
    it('should execute all provisioning steps in order', async () => {
      const { execFile } = await import('child_process');

      const result = await service.provision({
        email: 'admin@school.com',
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_456',
        tier: 'pro',
        organizationName: 'My School',
      });

      // Should have created a database
      expect(mockMasterDb.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('CREATE DATABASE'),
      );

      // Should have run migrations
      expect(execFile).toHaveBeenCalled();

      // Should have seeded admin
      expect(mockTenantUserCreate).toHaveBeenCalled();

      // Should have registered in master DB (INSERT INTO Tenant)
      const insertCall = mockMasterDb.$executeRawUnsafe.mock.calls.find(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('INSERT INTO "Tenant"'),
      );
      expect(insertCall).toBeDefined();
      expect(insertCall).toContain('admin@school.com');
      expect(insertCall).toContain('cus_123');
      expect(insertCall).toContain('sub_456');
      expect(insertCall).toContain('pro');

      // Should return result
      expect(result.tenantId).toBeTruthy();
      expect(result.databaseName).toMatch(/^tenant_/);
      expect(result.databaseUrl).toContain(result.databaseName);
    });

    it('should drop database if migration fails', async () => {
      const { execFile } = (await import('child_process')) as any;
      execFile.mockImplementationOnce(
        (_file: string, _args: string[], _options: unknown, callback: (error: Error) => void) => {
          callback(new Error('Migration failed'));
        },
      );

      await expect(
        service.provision({
          email: 'admin@school.com',
          stripeCustomerId: 'cus_123',
          stripeSubscriptionId: 'sub_456',
          tier: 'starter',
        }),
      ).rejects.toThrow('Migration failed');

      // Should have attempted cleanup (DROP DATABASE)
      const dropCall = mockMasterDb.$executeRawUnsafe.mock.calls.find(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('DROP DATABASE'),
      );
      expect(dropCall).toBeDefined();
    });
  });

  describe('dropDatabase', () => {
    it('should terminate connections and drop the database', async () => {
      await service.dropDatabase('tenant_abc12345');

      expect(mockMasterDb.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('pg_terminate_backend'),
        'tenant_abc12345',
      );
      expect(mockMasterDb.$executeRawUnsafe).toHaveBeenCalledWith(
        'DROP DATABASE IF EXISTS "tenant_abc12345"',
      );
    });

    it('should reject invalid names', async () => {
      await expect(service.dropDatabase('tenant;DROP')).rejects.toThrow(
        'Invalid database name',
      );
    });
  });
});
