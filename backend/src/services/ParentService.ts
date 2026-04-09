// src/services/ParentService.ts
import { Parent, Prisma } from '@prisma/client';
import { BaseService } from './BaseService';
import { NotFoundError } from '../utils/errors';

export interface CreateParentInput {
  childId: number;
  fullName: string;
  relation: string;
  phone?: string;
  email?: string;
  workplace?: string;
}

export interface UpdateParentInput extends Partial<Omit<CreateParentInput, 'childId'>> {}

class ParentServiceClass extends BaseService<Parent, CreateParentInput, UpdateParentInput> {
  protected get modelName() {
    return 'Родитель';
  }

  protected get allowedSortFields() {
    return ['id', 'fullName', 'relation', 'createdAt'];
  }

  async findByChildId(childId: number): Promise<Parent[]> {
    const numericId = this.validateNumericId(childId, 'ID ребёнка');
    return this.prisma.parent.findMany({
      where: { childId: numericId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(data: CreateParentInput): Promise<Parent> {
    // Verify child exists
    const child = await this.prisma.child.findUnique({ where: { id: data.childId } });
    if (!child) throw new NotFoundError('Ребёнок');

    return this.safeQuery(() =>
      this.prisma.parent.create({
        data: {
          childId: data.childId,
          fullName: data.fullName,
          relation: data.relation,
          phone: data.phone,
          email: data.email,
          workplace: data.workplace,
        },
      })
    );
  }

  async update(id: number, data: UpdateParentInput): Promise<Parent> {
    const numericId = this.validateNumericId(id);
    await this.ensureExists(this.prisma.parent, numericId);

    return this.safeQuery(() =>
      this.prisma.parent.update({
        where: { id: numericId },
        data: {
          ...(data.fullName !== undefined && { fullName: data.fullName }),
          ...(data.relation !== undefined && { relation: data.relation }),
          ...(data.phone !== undefined && { phone: data.phone }),
          ...(data.email !== undefined && { email: data.email }),
          ...(data.workplace !== undefined && { workplace: data.workplace }),
        },
      })
    );
  }

  async delete(id: number): Promise<void> {
    const numericId = this.validateNumericId(id);
    await this.safeQuery(() =>
      this.prisma.parent.delete({ where: { id: numericId } })
    );
  }

  /**
   * Sync parents array for a child: create new, update existing, delete removed.
   */
  async syncForChild(
    childId: number,
    parents: Array<{ id?: number; fullName: string; relation: string; phone?: string; email?: string; workplace?: string }>
  ): Promise<Parent[]> {
    const numericChildId = this.validateNumericId(childId, 'ID ребёнка');

    const existing = await this.prisma.parent.findMany({ where: { childId: numericChildId } });
    const incomingIds = parents.filter((p) => p.id).map((p) => p.id!);
    const toDelete = existing.filter((e) => !incomingIds.includes(e.id));

    // Delete removed parents
    if (toDelete.length > 0) {
      await this.prisma.parent.deleteMany({
        where: { id: { in: toDelete.map((p) => p.id) } },
      });
    }

    // Upsert remaining
    const results: Parent[] = [];
    for (const p of parents) {
      if (p.id) {
        const updated = await this.prisma.parent.update({
          where: { id: p.id },
          data: {
            fullName: p.fullName,
            relation: p.relation,
            phone: p.phone,
            email: p.email,
            workplace: p.workplace,
          },
        });
        results.push(updated);
      } else {
        const created = await this.prisma.parent.create({
          data: {
            childId: numericChildId,
            fullName: p.fullName,
            relation: p.relation,
            phone: p.phone,
            email: p.email,
            workplace: p.workplace,
          },
        });
        results.push(created);
      }
    }

    return results;
  }
}

export const ParentService = new ParentServiceClass();
