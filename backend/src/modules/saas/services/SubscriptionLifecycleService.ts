// src/modules/saas/services/SubscriptionLifecycleService.ts
// Manages the subscription state machine: active → soft-lock → hard-lock → purge.

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import { prisma as masterPrisma } from '../../../prisma';
import {
  SUBSCRIPTION_STATUS,
  LOCK_THRESHOLDS,
  SubscriptionStatus,
} from '../constants';

export interface TenantRecord {
  id: string;
  databaseName: string;
  databaseUrl: string;
  adminEmail: string;
  status: string;
  unpaidSince: Date | null;
}

/**
 * Handles the offboarding / subscription lifecycle state machine.
 *
 * Designed to be invoked by a cron job (e.g. once per hour) that calls
 * `processAllTenants()`, which iterates over every tenant and applies the
 * correct state transition.
 */
export class SubscriptionLifecycleService {
  private masterDb: PrismaClient;

  constructor(masterDb: PrismaClient = masterPrisma) {
    this.masterDb = masterDb;
  }

  // ---------------------------------------------------------------------------
  // Public entry-point – called from a cron job / scheduler
  // ---------------------------------------------------------------------------

  /**
   * Evaluate every tenant and advance their subscription state if necessary.
   */
  async processAllTenants(): Promise<void> {
    const tenants = await this.fetchUnpaidTenants();

    for (const tenant of tenants) {
      await this.evaluateTenant(tenant);
    }
  }

  // ---------------------------------------------------------------------------
  // State evaluation
  // ---------------------------------------------------------------------------

  async evaluateTenant(tenant: TenantRecord): Promise<void> {
    if (!tenant.unpaidSince) return;

    const daysSinceUnpaid = this.daysSince(tenant.unpaidSince);

    if (daysSinceUnpaid >= LOCK_THRESHOLDS.PURGE_DAYS) {
      await this.purge(tenant);
    } else if (
      daysSinceUnpaid >= LOCK_THRESHOLDS.HARD_LOCK_DAYS &&
      tenant.status !== SUBSCRIPTION_STATUS.HARD_LOCKED
    ) {
      await this.hardLock(tenant);
    } else if (
      daysSinceUnpaid >= LOCK_THRESHOLDS.SOFT_LOCK_DAYS &&
      tenant.status !== SUBSCRIPTION_STATUS.SOFT_LOCKED &&
      tenant.status !== SUBSCRIPTION_STATUS.HARD_LOCKED
    ) {
      await this.softLock(tenant);
    }
  }

  // ---------------------------------------------------------------------------
  // Soft Lock – block POST/PUT/PATCH/DELETE (read-only mode)
  // ---------------------------------------------------------------------------

  async softLock(tenant: TenantRecord): Promise<void> {
    await this.updateTenantStatus(
      tenant.id,
      SUBSCRIPTION_STATUS.SOFT_LOCKED,
    );
    console.log(
      `[SubscriptionLifecycle] Tenant ${tenant.id} soft-locked (unpaid ≥${LOCK_THRESHOLDS.SOFT_LOCK_DAYS}d)`,
    );
  }

  // ---------------------------------------------------------------------------
  // Hard Lock – redirect all requests to billing page
  // ---------------------------------------------------------------------------

  async hardLock(tenant: TenantRecord): Promise<void> {
    await this.updateTenantStatus(
      tenant.id,
      SUBSCRIPTION_STATUS.HARD_LOCKED,
    );
    console.log(
      `[SubscriptionLifecycle] Tenant ${tenant.id} hard-locked (unpaid ≥${LOCK_THRESHOLDS.HARD_LOCK_DAYS}d)`,
    );
  }

  // ---------------------------------------------------------------------------
  // Purge – export → email → DROP DATABASE
  // ---------------------------------------------------------------------------

  async purge(tenant: TenantRecord): Promise<void> {
    // Mark as purging (prevents duplicate runs)
    await this.updateTenantStatus(tenant.id, SUBSCRIPTION_STATUS.PURGING);

    try {
      // 1. Export database to a compressed SQL dump
      const exportPath = await this.exportDatabase(tenant);

      // 2. Email the admin with the ZIP attachment
      await this.emailExport(tenant.adminEmail, exportPath, tenant.id);

      // 3. DROP DATABASE
      await this.dropDatabase(tenant.databaseName);

      // 4. Mark as purged in the control plane
      await this.updateTenantStatus(tenant.id, SUBSCRIPTION_STATUS.PURGED);

      // 5. Clean up the local export file
      if (fs.existsSync(exportPath)) {
        fs.unlinkSync(exportPath);
      }

      console.log(
        `[SubscriptionLifecycle] Tenant ${tenant.id} purged (unpaid ≥${LOCK_THRESHOLDS.PURGE_DAYS}d)`,
      );
    } catch (err) {
      // Revert status so the next cron run can retry
      await this.updateTenantStatus(
        tenant.id,
        SUBSCRIPTION_STATUS.HARD_LOCKED,
      );
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async fetchUnpaidTenants(): Promise<TenantRecord[]> {
    const rows: TenantRecord[] = await this.masterDb.$queryRawUnsafe(
      `SELECT "id", "databaseName", "databaseUrl", "adminEmail", "status", "unpaidSince"
       FROM "Tenant"
       WHERE "unpaidSince" IS NOT NULL
         AND "status" NOT IN ($1, $2)`,
      SUBSCRIPTION_STATUS.PURGED,
      SUBSCRIPTION_STATUS.PURGING,
    );
    return rows;
  }

  private async updateTenantStatus(
    tenantId: string,
    status: SubscriptionStatus,
  ): Promise<void> {
    await this.masterDb.$executeRawUnsafe(
      `UPDATE "Tenant" SET "status" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
      status,
      tenantId,
    );
  }

  /**
   * Export tenant database to a ZIP file containing a pg_dump SQL file.
   * Returns the path to the ZIP.
   */
  async exportDatabase(tenant: TenantRecord): Promise<string> {
    const tmpDir = path.join('/tmp', 'tenant-exports');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const sqlFile = path.join(tmpDir, `${tenant.databaseName}.sql`);
    const zipFile = path.join(tmpDir, `${tenant.databaseName}.zip`);

    // pg_dump using the tenant's connection URL
    execSync(
      `pg_dump "${tenant.databaseUrl}" --no-owner --no-acl -f "${sqlFile}"`,
      { stdio: 'pipe', timeout: 300_000 },
    );

    // Compress to ZIP
    await new Promise<void>((resolve, reject) => {
      const output = fs.createWriteStream(zipFile);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', resolve);
      archive.on('error', reject);

      archive.pipe(output);
      archive.file(sqlFile, { name: `${tenant.databaseName}.sql` });
      archive.finalize();
    });

    // Remove the raw SQL file
    if (fs.existsSync(sqlFile)) {
      fs.unlinkSync(sqlFile);
    }

    return zipFile;
  }

  /**
   * Send the ZIP export to the tenant admin via email.
   */
  async emailExport(
    adminEmail: string,
    zipPath: string,
    tenantId: string,
  ): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@erp-saas.com',
      to: adminEmail,
      subject: `Your ERP data export – tenant ${tenantId}`,
      text: [
        `Hello,`,
        ``,
        `Your subscription for tenant ${tenantId} has been inactive for over ${LOCK_THRESHOLDS.PURGE_DAYS} days.`,
        `Attached is a full export of your database. The database has been permanently deleted from our servers.`,
        ``,
        `If you wish to reactivate, please start a new subscription at our website.`,
        ``,
        `Regards,`,
        `ERP SaaS Team`,
      ].join('\n'),
      attachments: [
        {
          filename: path.basename(zipPath),
          path: zipPath,
        },
      ],
    });
  }

  private async dropDatabase(dbName: string): Promise<void> {
    if (!/^[a-z0-9_]+$/.test(dbName)) {
      throw new Error(`Invalid database name: ${dbName}`);
    }
    await this.masterDb.$executeRawUnsafe(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
      dbName,
    );
    await this.masterDb.$executeRawUnsafe(
      `DROP DATABASE IF EXISTS "${dbName}"`,
    );
  }

  private daysSince(date: Date): number {
    const ms = Date.now() - new Date(date).getTime();
    return Math.floor(ms / (24 * 60 * 60 * 1000));
  }
}
