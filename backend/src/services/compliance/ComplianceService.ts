// src/services/compliance/ComplianceService.ts
//
// GDPR "Right to Be Forgotten" — hard-delete service.
//
// Recursively removes every trace of a user from the tenant database.
// The deletion follows referential integrity order so that foreign-key
// constraints are satisfied without disabling them.

import { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "../../prisma";
import { logger } from "../../utils/logger";

export interface HardDeleteResult {
  userId: number;
  tenantId: string;
  deletedEntities: Record<string, number>;
  completedAt: string;
}

export class ComplianceService {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  /**
   * Completely and irrecoverably removes a user and **all** related data
   * from the tenant database.
   *
   * Deletion order (deepest dependents first):
   *   1. DashboardPreference  (userId FK)
   *   2. ActionLog            (userId FK)
   *   3. KnowledgeBaseArticle (authorId FK)
   *   4. ExamAnswer → ExamSubmission → ExamQuestion → ExamTargetGroup → Exam
   *      (created by the user's employee)
   *   5. LMS records tied to the employee
   *   6. Employee-owned entities (clubs, maintenance, purchase orders, …)
   *   7. Employee + User rows themselves
   *
   * All mutations run inside a single transaction so the operation is
   * atomic — either everything is deleted or nothing is.
   */
  async hardDeleteUser(
    userId: number,
    tenantId: string,
  ): Promise<HardDeleteResult> {
    logger.info(
      `[Compliance] Starting GDPR hard-delete for userId=${userId} tenant=${tenantId}`,
    );

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, employeeId: true },
    });

    if (!user) {
      throw new Error(`User ${userId} not found in tenant ${tenantId}`);
    }

    const employeeId = user.employeeId;
    const counts: Record<string, number> = {};

    await this.prisma.$transaction(async (tx) => {
      // ── 1. Dashboard preferences ───────────────────────────────────
      const dashPref = await tx.dashboardPreference.deleteMany({
        where: { userId },
      });
      counts["dashboardPreference"] = dashPref.count;

      // ── 2. Action logs ─────────────────────────────────────────────
      const actionLogs = await tx.actionLog.deleteMany({
        where: { userId },
      });
      counts["actionLog"] = actionLogs.count;

      // ── 3. Knowledge-base articles authored by the user ────────────
      const articles = await tx.knowledgeBaseArticle.deleteMany({
        where: { authorId: userId },
      });
      counts["knowledgeBaseArticle"] = articles.count;

      // ── 4. Exam chain (deepest first) ──────────────────────────────
      //    Exams are created by an employee (creatorId).
      const examIds = (
        await tx.exam.findMany({
          where: { creatorId: employeeId },
          select: { id: true },
        })
      ).map((e) => e.id);

      if (examIds.length > 0) {
        // Answers → Submissions → Questions → TargetGroups → Exams
        const submissionIds = (
          await tx.examSubmission.findMany({
            where: { examId: { in: examIds } },
            select: { id: true },
          })
        ).map((s) => s.id);

        if (submissionIds.length > 0) {
          const answers = await tx.examAnswer.deleteMany({
            where: { submissionId: { in: submissionIds } },
          });
          counts["examAnswer"] = (counts["examAnswer"] ?? 0) + answers.count;
        }

        const submissions = await tx.examSubmission.deleteMany({
          where: { examId: { in: examIds } },
        });
        counts["examSubmission"] = submissions.count;

        const questions = await tx.examQuestion.deleteMany({
          where: { examId: { in: examIds } },
        });
        counts["examQuestion"] = questions.count;

        const targetGroups = await tx.examTargetGroup.deleteMany({
          where: { examId: { in: examIds } },
        });
        counts["examTargetGroup"] = targetGroups.count;

        const exams = await tx.exam.deleteMany({
          where: { id: { in: examIds } },
        });
        counts["exam"] = exams.count;
      }

      // ── 5. LMS records tied to the employee ────────────────────────
      const lmsHomeworkIds = (
        await tx.lmsHomework.findMany({
          where: { teacherId: employeeId },
          select: { id: true },
        })
      ).map((h) => h.id);

      if (lmsHomeworkIds.length > 0) {
        const hwSubs = await tx.lmsHomeworkSubmission.deleteMany({
          where: { homeworkId: { in: lmsHomeworkIds } },
        });
        counts["lmsHomeworkSubmission"] = hwSubs.count;
      }

      const lmsHomework = await tx.lmsHomework.deleteMany({
        where: { teacherId: employeeId },
      });
      counts["lmsHomework"] = lmsHomework.count;

      const lmsGrades = await tx.lmsGrade.deleteMany({
        where: { teacherId: employeeId },
      });
      counts["lmsGrade"] = lmsGrades.count;

      const lmsSchedule = await tx.lmsScheduleItem.deleteMany({
        where: { teacherId: employeeId },
      });
      counts["lmsScheduleItem"] = lmsSchedule.count;

      // ── 6. Employee-owned operational data ─────────────────────────
      // Cleaning schedules
      const cleaning = await tx.cleaningSchedule.deleteMany({
        where: { assignedToId: employeeId },
      });
      counts["cleaningSchedule"] = cleaning.count;

      // Employee attendance
      const empAttendance = await tx.employeeAttendance.deleteMany({
        where: { employeeId },
      });
      counts["employeeAttendance"] = empAttendance.count;

      // Documents
      const docs = await tx.document.deleteMany({
        where: { employeeId },
      });
      counts["document"] = docs.count;

      // Inventory transactions
      const invTx = await tx.inventoryTransaction.deleteMany({
        where: { performedById: employeeId },
      });
      counts["inventoryTransaction"] = invTx.count;

      // Maintenance requests (as requester)
      // First delete child items of requests
      const reqIds = (
        await tx.maintenanceRequest.findMany({
          where: { requesterId: employeeId },
          select: { id: true },
        })
      ).map((r) => r.id);

      if (reqIds.length > 0) {
        const maintItems = await tx.maintenanceItem.deleteMany({
          where: { requestId: { in: reqIds } },
        });
        counts["maintenanceItem"] = maintItems.count;
      }

      const maintReqs = await tx.maintenanceRequest.deleteMany({
        where: { requesterId: employeeId },
      });
      counts["maintenanceRequest"] = maintReqs.count;

      // Nullify approver references on maintenance requests approved by this employee
      const nullifyApproved = await tx.maintenanceRequest.updateMany({
        where: { approvedById: employeeId },
        data: { approvedById: null },
      });
      counts["maintenanceRequest_nullifiedApprover"] = nullifyApproved.count;

      // Purchase orders – nullify creator/approver/receiver references
      // Note: createdById is required (non-nullable), so we must delete orders this user created
      const poIds = (
        await tx.purchaseOrder.findMany({
          where: { createdById: employeeId },
          select: { id: true },
        })
      ).map((po) => po.id);

      if (poIds.length > 0) {
        const poItems = await tx.purchaseOrderItem.deleteMany({
          where: { orderId: { in: poIds } },
        });
        counts["purchaseOrderItem"] = poItems.count;

        const pos = await tx.purchaseOrder.deleteMany({
          where: { id: { in: poIds } },
        });
        counts["purchaseOrder"] = pos.count;
      }

      const nullifyPOApprover = await tx.purchaseOrder.updateMany({
        where: { approvedById: employeeId },
        data: { approvedById: null },
      });
      counts["purchaseOrder_nullifiedApprover"] = nullifyPOApprover.count;

      const nullifyPOReceiver = await tx.purchaseOrder.updateMany({
        where: { receivedById: employeeId },
        data: { receivedById: null },
      });
      counts["purchaseOrder_nullifiedReceiver"] = nullifyPOReceiver.count;

      // Nullify classTeacher references on groups
      const nullifyTeacher = await tx.group.updateMany({
        where: { teacherId: employeeId },
        data: { teacherId: null },
      });
      counts["group_nullifiedTeacher"] = nullifyTeacher.count;

      // Teacher subjects
      const teacherSubjects = await tx.teacherSubject.deleteMany({
        where: { employeeId },
      });
      counts["teacherSubject"] = teacherSubjects.count;

      // Schedule slots where this employee teaches
      const scheduleSlots = await tx.scheduleSlot.deleteMany({
        where: { teacherId: employeeId },
      });
      counts["scheduleSlot"] = scheduleSlots.count;

      // ── 7. User + Employee ─────────────────────────────────────────
      await tx.user.delete({ where: { id: userId } });
      counts["user"] = 1;

      await tx.employee.delete({ where: { id: employeeId } });
      counts["employee"] = 1;
    });

    const result: HardDeleteResult = {
      userId,
      tenantId,
      deletedEntities: counts,
      completedAt: new Date().toISOString(),
    };

    logger.info(
      `[Compliance] GDPR hard-delete completed for userId=${userId} tenant=${tenantId}`,
      result.deletedEntities,
    );

    return result;
  }
}
