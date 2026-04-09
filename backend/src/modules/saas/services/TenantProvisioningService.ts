// src/modules/saas/services/TenantProvisioningService.ts
// Handles the full lifecycle of provisioning a new tenant database.

import { execFile } from 'child_process';
import crypto from 'crypto';
import path from 'path';
import { promisify } from 'util';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma as masterPrisma } from '../../../prisma';
import { TENANT_DB_PREFIX, SUBSCRIPTION_STATUS, PricingTier } from '../constants';

export interface ProvisioningInput {
  /** Email provided during Stripe checkout */
  email: string;
  /** Stripe customer ID */
  stripeCustomerId: string;
  /** Stripe subscription ID */
  stripeSubscriptionId: string;
  /** Pricing tier purchased */
  tier: PricingTier;
  /** Optional organisation / school name */
  organizationName?: string;
}

export interface ProvisioningResult {
  tenantId: string;
  databaseName: string;
  databaseUrl: string;
}

/**
 * Factory for creating a PrismaClient connected to a tenant database.
 * Can be overridden in tests.
 */
export type TenantPrismaFactory = (databaseUrl: string) => PrismaClient;

const defaultTenantPrismaFactory: TenantPrismaFactory = (databaseUrl) =>
  new PrismaClient({ datasources: { db: { url: databaseUrl } } });

const execFileAsync = promisify(execFile);

/**
 * Builds a PostgreSQL connection URL for a given database name,
 * inheriting host / user / password from the master DATABASE_URL.
 */
export function buildTenantDatabaseUrl(dbName: string): string {
  const masterUrl = process.env.DATABASE_URL || '';
  const url = new URL(masterUrl);
  // Replace the path (database name) while keeping credentials & host
  url.pathname = `/${dbName}`;
  // Remove schema search param – each tenant DB uses the default "public" schema
  url.searchParams.delete('schema');
  return url.toString();
}

/**
 * Generates a unique, safe database name.
 * Format: tenant_<8-hex-chars>
 */
export function generateDatabaseName(): string {
  const id = crypto.randomBytes(4).toString('hex');
  return `${TENANT_DB_PREFIX}${id}`;
}

/**
 * Orchestrates the tenant provisioning pipeline:
 *
 * 1. Generate unique DB name
 * 2. CREATE DATABASE on the PostgreSQL server
 * 3. Run Prisma migrations against the new DB
 * 4. Seed a SuperAdmin user into the new DB
 * 5. Record the tenant in the master (control-plane) database
 */
export class TenantProvisioningService {
  private masterDb: PrismaClient;
  private tenantPrismaFactory: TenantPrismaFactory;

  constructor(
    masterDb: PrismaClient = masterPrisma,
    tenantPrismaFactory: TenantPrismaFactory = defaultTenantPrismaFactory,
  ) {
    this.masterDb = masterDb;
    this.tenantPrismaFactory = tenantPrismaFactory;
  }

  async provision(input: ProvisioningInput): Promise<ProvisioningResult> {
    const dbName = generateDatabaseName();
    const dbUrl = buildTenantDatabaseUrl(dbName);
    const tenantId = dbName.replace(TENANT_DB_PREFIX, '');

    // Step 1 – Create the physical database
    await this.createDatabase(dbName);

    try {
      // Step 2 – Run Prisma migrations on the new database
      await this.runMigrations(dbUrl);

      // Step 3 – Seed the SuperAdmin user
      await this.seedSuperAdmin(dbUrl, input.email);

      // Step 4 – Register tenant in master DB
      await this.registerTenant({
        tenantId,
        dbName,
        dbUrl,
        ...input,
      });

      return { tenantId, databaseName: dbName, databaseUrl: dbUrl };
    } catch (error) {
      // Best-effort cleanup: drop the database if any step after creation fails
      await this.dropDatabase(dbName).catch(() => {
        /* swallow cleanup errors */
      });
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Step 1 – Physical database creation
  // ---------------------------------------------------------------------------

  async createDatabase(dbName: string): Promise<void> {
    // Sanitise: only allow alphanumerics and underscores
    if (!/^[a-z0-9_]+$/.test(dbName)) {
      throw new Error(`Invalid database name: ${dbName}`);
    }
    // CREATE DATABASE cannot run inside a transaction, so use $executeRawUnsafe
    // with a pre-validated identifier.
    await this.masterDb.$executeRawUnsafe(
      `CREATE DATABASE "${dbName}"`,
    );
  }

  // ---------------------------------------------------------------------------
  // Step 2 – Prisma migrations
  // ---------------------------------------------------------------------------

  async runMigrations(databaseUrl: string): Promise<void> {
    const schemaPath = path.resolve(
      __dirname,
      '../../../../prisma/schema.prisma',
    );

    await execFileAsync(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      ['prisma', 'migrate', 'deploy', `--schema=${schemaPath}`],
      {
        env: { ...process.env, DATABASE_URL: databaseUrl },
        timeout: 120_000,
        maxBuffer: 10 * 1024 * 1024,
        windowsHide: true,
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Step 3 – Seed the first SuperAdmin user
  // ---------------------------------------------------------------------------

  async seedSuperAdmin(databaseUrl: string, email: string): Promise<void> {
    const tenantPrisma = this.tenantPrismaFactory(databaseUrl);

    try {
      const passwordHash = await bcrypt.hash(
        crypto.randomBytes(16).toString('hex'),
        10,
      );

      // Create employee first (required by schema)
      const employee = await tenantPrisma.employee.create({
        data: {
          fullName: 'Super Admin',
          position: 'Administrator',
          phone: '',
          hireDate: new Date(),
        },
      });

      await tenantPrisma.user.create({
        data: {
          email,
          passwordHash,
          role: 'DEVELOPER', // Highest privilege role
          employeeId: employee.id,
        },
      });
    } finally {
      await tenantPrisma.$disconnect();
    }
  }

  // ---------------------------------------------------------------------------
  // Step 4 – Register in Master DB
  // ---------------------------------------------------------------------------

  private async registerTenant(data: {
    tenantId: string;
    dbName: string;
    dbUrl: string;
    email: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    tier: PricingTier;
    organizationName?: string;
  }): Promise<void> {
    await this.masterDb.$executeRawUnsafe(
      `INSERT INTO "Tenant" (
        "id", "databaseName", "databaseUrl", "adminEmail",
        "stripeCustomerId", "stripeSubscriptionId",
        "tier", "status", "organizationName",
        "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
      data.tenantId,
      data.dbName,
      data.dbUrl,
      data.email,
      data.stripeCustomerId,
      data.stripeSubscriptionId,
      data.tier,
      SUBSCRIPTION_STATUS.ACTIVE,
      data.organizationName || null,
    );
  }

  // ---------------------------------------------------------------------------
  // Cleanup helper
  // ---------------------------------------------------------------------------

  async dropDatabase(dbName: string): Promise<void> {
    if (!/^[a-z0-9_]+$/.test(dbName)) {
      throw new Error(`Invalid database name: ${dbName}`);
    }
    // Terminate existing connections first
    await this.masterDb.$executeRawUnsafe(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
      dbName,
    );
    await this.masterDb.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${dbName}"`);
  }
}
