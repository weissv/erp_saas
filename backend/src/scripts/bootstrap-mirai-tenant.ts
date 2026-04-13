import bcrypt from "bcryptjs";
import { PrismaClient as TenantPrismaClient, Role } from "@prisma/client";
import { PrismaClient as MasterPrismaClient, TenantStatus } from "@prisma/master-client";

type BootstrapConfig = {
  masterDatabaseUrl: string;
  tenantDatabaseUrl: string;
  tenantSubdomain: string;
  tenantName: string;
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
  adminMiddleName?: string;
  adminPosition: string;
};

async function main(): Promise<void> {
  const settings = loadConfig();
  const master = new MasterPrismaClient({ datasourceUrl: settings.masterDatabaseUrl });
  const tenant = new TenantPrismaClient({
    datasources: {
      db: {
        url: settings.tenantDatabaseUrl,
      },
    },
  });

  try {
    const tenantRecord = await master.tenant.upsert({
      where: { subdomain: settings.tenantSubdomain },
      update: {
        dbUrl: settings.tenantDatabaseUrl,
        name: settings.tenantName,
        status: TenantStatus.ACTIVE,
      },
      create: {
        subdomain: settings.tenantSubdomain,
        dbUrl: settings.tenantDatabaseUrl,
        name: settings.tenantName,
        status: TenantStatus.ACTIVE,
      },
    });

    const passwordHash = await bcrypt.hash(settings.adminPassword, 10);
    const existingUser = await tenant.user.findUnique({
      where: { email: settings.adminEmail },
      include: { employee: true },
    });

    if (existingUser?.employee) {
      await tenant.$transaction([
        tenant.employee.update({
          where: { id: existingUser.employeeId },
          data: {
            firstName: settings.adminFirstName,
            lastName: settings.adminLastName,
            middleName: settings.adminMiddleName || null,
            position: settings.adminPosition,
          },
        }),
        tenant.user.update({
          where: { id: existingUser.id },
          data: {
            passwordHash,
            role: Role.DEVELOPER,
            deletedAt: null,
          },
        }),
      ]);

      console.log(
        `[bootstrap] Updated tenant ${tenantRecord.subdomain} and reset credentials for ${settings.adminEmail}`,
      );
      return;
    }

    await tenant.$transaction(async (tx) => {
      const employee = await tx.employee.create({
        data: {
          firstName: settings.adminFirstName,
          lastName: settings.adminLastName,
          middleName: settings.adminMiddleName || null,
          position: settings.adminPosition,
          rate: 1,
          hireDate: new Date(),
        },
      });

      await tx.user.create({
        data: {
          email: settings.adminEmail,
          passwordHash,
          role: Role.DEVELOPER,
          employeeId: employee.id,
        },
      });
    });

    console.log(
      `[bootstrap] Created tenant ${tenantRecord.subdomain} and initial admin ${settings.adminEmail}`,
    );
  } finally {
    await Promise.all([tenant.$disconnect(), master.$disconnect()]);
  }
}

function loadConfig(): BootstrapConfig {
  return {
    masterDatabaseUrl: requireEnv("MASTER_DATABASE_URL"),
    tenantDatabaseUrl: requireEnv("DATABASE_URL"),
    tenantSubdomain: process.env.INITIAL_TENANT_SUBDOMAIN?.trim() || "mirai",
    tenantName: process.env.INITIAL_TENANT_NAME?.trim() || "Mirai ERP",
    adminEmail: requireEnv("INITIAL_ADMIN_EMAIL"),
    adminPassword: requireEnv("INITIAL_ADMIN_PASSWORD"),
    adminFirstName: process.env.INITIAL_ADMIN_FIRST_NAME?.trim() || "System",
    adminLastName: process.env.INITIAL_ADMIN_LAST_NAME?.trim() || "Administrator",
    adminMiddleName: process.env.INITIAL_ADMIN_MIDDLE_NAME?.trim() || undefined,
    adminPosition: process.env.INITIAL_ADMIN_POSITION?.trim() || "System Administrator",
  };
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[bootstrap] Failed to bootstrap initial tenant: ${message}`);
  process.exit(1);
});