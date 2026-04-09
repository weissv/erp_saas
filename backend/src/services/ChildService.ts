// src/services/ChildService.ts
// Сервис для работы с детьми — единый источник бизнес-логики

import { Child, Prisma, Gender, ChildStatus } from '@prisma/client';
import { BaseService, PaginationParams, SortParams, PaginatedResult } from './BaseService';
import { NotFoundError, ValidationError } from '../utils/errors';
import { ParentService } from './ParentService';

// --- Interfaces ---

export interface ChildFilters {
  status?: string;
  groupId?: number;
  search?: string; // multi-field: firstName, lastName, middleName
  gender?: string;
}

export interface HealthInfoInput {
  allergies?: string[];
  specialConditions?: string[];
  medications?: string[];
  notes?: string;
}

export interface ParentInput {
  id?: number;
  fullName: string;
  relation: string;
  phone?: string;
  email?: string;
  workplace?: string;
}

export interface CreateChildInput {
  firstName: string;
  lastName: string;
  middleName?: string;
  birthDate: string | Date;
  groupId: number;
  healthInfo?: HealthInfoInput;
  address?: string;
  nationality?: string;
  gender?: Gender;
  birthCertificateNumber?: string;
  contractNumber?: string;
  contractDate?: string | Date;
  parents?: ParentInput[];
  // Legacy fields (backward compat)
  fatherName?: string;
  motherName?: string;
  parentPhone?: string;
}

export interface UpdateChildInput extends Partial<CreateChildInput> {}

// --- Response types ---

const groupSelect = { id: true, name: true, grade: true } as const;

const parentSelect = {
  id: true,
  fullName: true,
  relation: true,
  phone: true,
  email: true,
  workplace: true,
} as const;

const childListInclude = {
  group: { select: groupSelect },
  parents: { select: parentSelect },
} as const;

const childDetailInclude = {
  group: { select: { ...groupSelect, capacity: true, academicYear: true } },
  parents: { select: parentSelect },
  temporaryAbsences: { orderBy: { startDate: 'desc' as const }, take: 5 },
  enrollments: {
    include: { club: { select: { id: true, name: true } } },
    where: { status: 'ACTIVE' as const },
  },
} as const;

export type ChildListItem = Prisma.ChildGetPayload<{ include: typeof childListInclude }>;
export type ChildDetail = Prisma.ChildGetPayload<{ include: typeof childDetailInclude }>;

// --- Service ---

class ChildServiceClass extends BaseService<Child, CreateChildInput, UpdateChildInput> {
  protected get modelName() {
    return 'Ребёнок';
  }

  protected get allowedSortFields() {
    return ['id', 'firstName', 'lastName', 'birthDate', 'status', 'groupId', 'createdAt'];
  }

  // --- List ---

  async findMany(
    params: PaginationParams & SortParams & ChildFilters
  ): Promise<PaginatedResult<ChildListItem>> {
    const pagination = this.buildPagination(params);
    const orderBy = this.buildOrderBy(params);

    const where: Prisma.ChildWhereInput = {};

    if (params.status) {
      where.status = params.status as ChildStatus;
    }
    if (params.groupId) {
      where.groupId = params.groupId;
    }
    if (params.gender) {
      where.gender = params.gender as Gender;
    }
    if (params.search) {
      const term = params.search.trim();
      where.OR = [
        { lastName: { contains: term, mode: 'insensitive' } },
        { firstName: { contains: term, mode: 'insensitive' } },
        { middleName: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.child.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy,
        include: childListInclude,
      }),
      this.prisma.child.count({ where }),
    ]);

    return this.formatPaginatedResult(items, total, pagination);
  }

  // --- Detail ---

  async findById(id: number): Promise<ChildDetail> {
    const numericId = this.validateNumericId(id);

    const child = await this.prisma.child.findUnique({
      where: { id: numericId },
      include: childDetailInclude,
    });

    if (!child) {
      throw new NotFoundError(this.modelName);
    }

    return child;
  }

  // --- Create ---

  async create(data: CreateChildInput): Promise<ChildDetail> {
    // Validate group
    const group = await this.prisma.group.findUnique({ where: { id: data.groupId } });
    if (!group) throw new NotFoundError('Группа');

    const birthDate = this.parseDate(data.birthDate, 'дата рождения');
    this.validateBirthDate(birthDate);

    const child = await this.safeQuery(() =>
      this.prisma.child.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          middleName: data.middleName,
          birthDate,
          groupId: data.groupId,
          healthInfo: data.healthInfo ? (data.healthInfo as unknown as Prisma.InputJsonValue) : undefined,
          address: data.address,
          nationality: data.nationality,
          gender: data.gender,
          birthCertificateNumber: data.birthCertificateNumber,
          contractNumber: data.contractNumber,
          contractDate: data.contractDate ? this.parseDate(data.contractDate, 'дата договора') : undefined,
          // Legacy fields
          fatherName: data.fatherName,
          motherName: data.motherName,
          parentPhone: data.parentPhone,
        },
        include: childDetailInclude,
      })
    );

    // Create parents if provided
    if (data.parents?.length) {
      await ParentService.syncForChild(child.id, data.parents);
    }

    // LMS sync
    await this.syncWithLms(child.id, child.groupId);

    // Re-fetch with parents
    return this.findById(child.id);
  }

  // --- Update ---

  async update(id: number, data: UpdateChildInput): Promise<ChildDetail> {
    const numericId = this.validateNumericId(id);
    const existing = await this.findById(numericId);

    // Validate new group if changing
    if (data.groupId && data.groupId !== existing.groupId) {
      const group = await this.prisma.group.findUnique({ where: { id: data.groupId } });
      if (!group) throw new NotFoundError('Группа');
    }

    const updateData: Prisma.ChildUpdateInput = {};

    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.middleName !== undefined) updateData.middleName = data.middleName || null;
    if (data.birthDate !== undefined) {
      const bd = this.parseDate(data.birthDate, 'дата рождения');
      this.validateBirthDate(bd);
      updateData.birthDate = bd;
    }
    if (data.groupId !== undefined) updateData.group = { connect: { id: data.groupId } };
    if (data.healthInfo !== undefined) updateData.healthInfo = data.healthInfo as unknown as Prisma.InputJsonValue;
    if (data.address !== undefined) updateData.address = data.address || null;
    if (data.nationality !== undefined) updateData.nationality = data.nationality || null;
    if (data.gender !== undefined) updateData.gender = data.gender || null;
    if (data.birthCertificateNumber !== undefined) updateData.birthCertificateNumber = data.birthCertificateNumber || null;
    if (data.contractNumber !== undefined) updateData.contractNumber = data.contractNumber || null;
    if (data.contractDate !== undefined) {
      updateData.contractDate = data.contractDate ? this.parseDate(data.contractDate, 'дата договора') : null;
    }
    // Legacy fields
    if (data.fatherName !== undefined) updateData.fatherName = data.fatherName || null;
    if (data.motherName !== undefined) updateData.motherName = data.motherName || null;
    if (data.parentPhone !== undefined) updateData.parentPhone = data.parentPhone || null;

    await this.safeQuery(() =>
      this.prisma.child.update({ where: { id: numericId }, data: updateData })
    );

    // Sync parents if provided
    if (data.parents !== undefined) {
      await ParentService.syncForChild(numericId, data.parents);
    }

    // LMS sync if group changed
    if (data.groupId) {
      await this.syncWithLms(numericId, data.groupId);
    }

    return this.findById(numericId);
  }

  // --- Archive (soft delete) ---

  async archive(id: number): Promise<void> {
    const numericId = this.validateNumericId(id);
    await this.findById(numericId); // ensure exists

    await this.safeQuery(() =>
      this.prisma.child.update({
        where: { id: numericId },
        data: { status: 'ARCHIVED' },
      })
    );

    // Update LMS status
    await this.prisma.lmsSchoolStudent.updateMany({
      where: { studentId: numericId },
      data: { status: 'archived' },
    });
  }

  // --- Hard delete (admin only) ---

  async delete(id: number): Promise<void> {
    const numericId = this.validateNumericId(id);

    // Delete all related records to avoid foreign key constraint errors
    await this.safeQuery(async () => {
      await this.prisma.$transaction([
        this.prisma.lmsSchoolStudent.deleteMany({ where: { studentId: numericId } }),
        this.prisma.clubEnrollment.deleteMany({ where: { childId: numericId } }),
        this.prisma.attendance.deleteMany({ where: { childId: numericId } }),
        this.prisma.document.deleteMany({ where: { childId: numericId } }),
        this.prisma.temporaryAbsence.deleteMany({ where: { childId: numericId } }),
        this.prisma.clubRating.deleteMany({ where: { childId: numericId } }),
        this.prisma.parent.deleteMany({ where: { childId: numericId } })
      ]);
      await this.prisma.child.delete({ where: { id: numericId } });
    });
  }

  // --- Absence management ---

  async getAbsences(childId: number) {
    const numericId = this.validateNumericId(childId);
    return this.prisma.temporaryAbsence.findMany({
      where: { childId: numericId },
      orderBy: { startDate: 'desc' },
    });
  }

  async addAbsence(childId: number, data: { startDate: string; endDate: string; reason?: string }) {
    const numericId = this.validateNumericId(childId);
    await this.findById(numericId);

    const startDate = this.parseDate(data.startDate, 'дата начала');
    const endDate = this.parseDate(data.endDate, 'дата окончания');

    if (startDate > endDate) {
      throw new ValidationError('Дата начала не может быть позже даты окончания');
    }

    // Check for overlapping absences
    const overlap = await this.prisma.temporaryAbsence.findFirst({
      where: {
        childId: numericId,
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });
    if (overlap) {
      throw new ValidationError('Период пересекается с существующим отсутствием');
    }

    return this.prisma.temporaryAbsence.create({
      data: { childId: numericId, startDate, endDate, reason: data.reason },
    });
  }

  async updateAbsence(absenceId: number, data: { startDate?: string; endDate?: string; reason?: string }) {
    const numericId = this.validateNumericId(absenceId, 'ID отсутствия');

    return this.safeQuery(() =>
      this.prisma.temporaryAbsence.update({
        where: { id: numericId },
        data: {
          ...(data.startDate && { startDate: this.parseDate(data.startDate) }),
          ...(data.endDate && { endDate: this.parseDate(data.endDate) }),
          ...(data.reason !== undefined && { reason: data.reason }),
        },
      })
    );
  }

  async deleteAbsence(absenceId: number): Promise<void> {
    const numericId = this.validateNumericId(absenceId, 'ID отсутствия');
    await this.safeQuery(() =>
      this.prisma.temporaryAbsence.delete({ where: { id: numericId } })
    );
  }

  // --- LMS Sync (private) ---

  private async syncWithLms(childId: number, groupId: number): Promise<void> {
    const existing = await this.prisma.lmsSchoolStudent.findFirst({
      where: { studentId: childId },
    });

    if (existing) {
      if (existing.classId !== groupId) {
        await this.prisma.lmsSchoolStudent.update({
          where: { id: existing.id },
          data: { classId: groupId },
        });
      }
    } else {
      await this.prisma.lmsSchoolStudent.create({
        data: { studentId: childId, classId: groupId, status: 'active' },
      });
    }
  }

  // --- Helpers ---

  private validateBirthDate(date: Date): void {
    const now = new Date();
    if (date > now) {
      throw new ValidationError('Дата рождения не может быть в будущем');
    }
    const minDate = new Date(now.getFullYear() - 25, now.getMonth(), now.getDate());
    if (date < minDate) {
      throw new ValidationError('Дата рождения слишком далеко в прошлом');
    }
  }
}

export const ChildService = new ChildServiceClass();
