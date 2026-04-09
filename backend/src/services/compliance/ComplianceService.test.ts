// src/services/compliance/ComplianceService.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ComplianceService } from "./ComplianceService";

// ── Mock helpers (vi.hoisted so they're available inside vi.mock) ─────────
const mockFns = vi.hoisted(() => ({
  findUnique: vi.fn(),
  deleteMany: vi.fn(),
  delete: vi.fn(),
  findMany: vi.fn(),
  updateMany: vi.fn(),
  transaction: vi.fn(),
}));

// Build a model stub that has all needed Prisma methods — each stub gets UNIQUE fns
function modelStub() {
  return {
    findUnique: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    delete: vi.fn().mockResolvedValue({}),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    count: vi.fn(),
    aggregate: vi.fn(),
  };
}

const fakeTransaction = vi.fn(async (fn: (tx: unknown) => Promise<void>) => {
  // The tx object exposes the same model stubs
  await fn(fakePrisma);
});

const fakePrisma = {
  user: { ...modelStub() },
  employee: { ...modelStub() },
  actionLog: { ...modelStub() },
  dashboardPreference: { ...modelStub() },
  knowledgeBaseArticle: { ...modelStub() },
  exam: { ...modelStub() },
  examSubmission: { ...modelStub() },
  examAnswer: { ...modelStub() },
  examQuestion: { ...modelStub() },
  examTargetGroup: { ...modelStub() },
  lmsHomework: { ...modelStub() },
  lmsHomeworkSubmission: { ...modelStub() },
  lmsGrade: { ...modelStub() },
  lmsScheduleItem: { ...modelStub() },
  cleaningSchedule: { ...modelStub() },
  employeeAttendance: { ...modelStub() },
  document: { ...modelStub() },
  inventoryTransaction: { ...modelStub() },
  maintenanceRequest: { ...modelStub() },
  maintenanceItem: { ...modelStub() },
  purchaseOrder: { ...modelStub() },
  group: { ...modelStub() },
  teacherSubject: { ...modelStub() },
  scheduleSlot: { ...modelStub() },
  purchaseOrderItem: { ...modelStub() },
  $transaction: fakeTransaction,
} as any;

// Silence logger
vi.mock("../../utils/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe("ComplianceService", () => {
  let service: ComplianceService;

  beforeEach(() => {
    // Re-apply defaults after global vi.clearAllMocks()
    for (const model of Object.values(fakePrisma)) {
      if (model && typeof model === "object") {
        if ("deleteMany" in model) {
          (model as any).deleteMany.mockResolvedValue({ count: 0 });
        }
        if ("findMany" in model) {
          (model as any).findMany.mockResolvedValue([]);
        }
        if ("updateMany" in model) {
          (model as any).updateMany.mockResolvedValue({ count: 0 });
        }
        if ("delete" in model) {
          (model as any).delete.mockResolvedValue({});
        }
      }
    }

    // Default: user exists
    fakePrisma.user.findUnique.mockResolvedValue({
      id: 42,
      employeeId: 7,
    });

    service = new ComplianceService(fakePrisma);
  });

  it("should throw if user does not exist", async () => {
    fakePrisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.hardDeleteUser(999, "test-tenant"),
    ).rejects.toThrow("User 999 not found in tenant test-tenant");
  });

  it("should delete user and employee records inside a transaction", async () => {
    const result = await service.hardDeleteUser(42, "hogwarts");

    // Transaction was called
    expect(fakeTransaction).toHaveBeenCalledTimes(1);

    // Core entities removed
    expect(result.deletedEntities["user"]).toBe(1);
    expect(result.deletedEntities["employee"]).toBe(1);
    expect(result.tenantId).toBe("hogwarts");
    expect(result.userId).toBe(42);
    expect(result.completedAt).toBeDefined();
  });

  it("should delete action logs for the user", async () => {
    fakePrisma.actionLog.deleteMany.mockResolvedValue({ count: 5 });

    const result = await service.hardDeleteUser(42, "hogwarts");
    expect(result.deletedEntities["actionLog"]).toBe(5);
  });

  it("should cascade delete exams owned by the employee", async () => {
    // Employee owns 2 exams
    fakePrisma.exam.findMany.mockResolvedValue([
      { id: 100 },
      { id: 101 },
    ]);
    fakePrisma.examSubmission.findMany.mockResolvedValue([
      { id: 200 },
    ]);
    fakePrisma.examAnswer.deleteMany.mockResolvedValue({ count: 3 });
    fakePrisma.examSubmission.deleteMany.mockResolvedValue({ count: 1 });
    fakePrisma.examQuestion.deleteMany.mockResolvedValue({ count: 10 });
    fakePrisma.examTargetGroup.deleteMany.mockResolvedValue({ count: 2 });
    fakePrisma.exam.deleteMany.mockResolvedValue({ count: 2 });

    const result = await service.hardDeleteUser(42, "hogwarts");

    expect(result.deletedEntities["exam"]).toBe(2);
    expect(result.deletedEntities["examAnswer"]).toBe(3);
    expect(result.deletedEntities["examSubmission"]).toBe(1);
    expect(result.deletedEntities["examQuestion"]).toBe(10);
    expect(result.deletedEntities["examTargetGroup"]).toBe(2);
  });

  it("should delete LMS homework and submissions", async () => {
    fakePrisma.lmsHomework.findMany.mockResolvedValue([{ id: 50 }]);
    fakePrisma.lmsHomeworkSubmission.deleteMany.mockResolvedValue({
      count: 4,
    });
    fakePrisma.lmsHomework.deleteMany.mockResolvedValue({ count: 1 });

    const result = await service.hardDeleteUser(42, "hogwarts");

    expect(result.deletedEntities["lmsHomework"]).toBe(1);
    expect(result.deletedEntities["lmsHomeworkSubmission"]).toBe(4);
  });

  it("should nullify group teacher references instead of deleting groups", async () => {
    fakePrisma.group.updateMany.mockResolvedValue({ count: 2 });

    const result = await service.hardDeleteUser(42, "hogwarts");

    expect(result.deletedEntities["group_nullifiedTeacher"]).toBe(2);
  });
});
