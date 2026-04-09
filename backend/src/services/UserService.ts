import bcrypt from 'bcryptjs';
import { Prisma, Role, User } from '@prisma/client';
import { BaseService, PaginationParams, PaginatedResult, SortParams } from './BaseService';
import { ConflictError, NotFoundError, ValidationError, AuthorizationError } from '../utils/errors';

export interface UserFilters {
  role?: Role;
  status?: 'ACTIVE' | 'INACTIVE' | 'ALL';
  search?: string;
}

export interface ActorContext {
  id: number;
  role: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
  role: Role;
  employeeId: number;
}

export interface UpdateUserInput {
  email?: string;
  password?: string;
  role?: Role;
}

const PROTECTED_ROLES: Role[] = ['DEVELOPER', 'DIRECTOR'];

const USER_SELECT = {
  id: true,
  email: true,
  role: true,
  employeeId: true,
  telegramChatId: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  employee: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      position: true,
    },
  },
} satisfies Prisma.UserSelect;

type UserRecord = Prisma.UserGetPayload<{ select: typeof USER_SELECT }>;

class UserServiceClass extends BaseService<User, CreateUserInput, UpdateUserInput> {
  protected get modelName() {
    return 'Пользователь';
  }

  protected get allowedSortFields() {
    return ['id', 'email', 'role', 'createdAt', 'updatedAt'];
  }

  async findMany(
    params: PaginationParams & SortParams & UserFilters
  ): Promise<PaginatedResult<ReturnType<UserServiceClass['serializeUser']>>> {
    const pagination = this.buildPagination(params);
    const orderBy = this.buildOrderBy(params);
    const where = this.buildWhere(params);

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy,
        select: USER_SELECT,
      }),
      this.prisma.user.count({ where }),
    ]);

    return this.formatPaginatedResult(items.map((item) => this.serializeUser(item)), total, pagination);
  }

  async findById(id: number, includeInactive: boolean = true) {
    const numericId = this.validateNumericId(id);

    const user = await this.prisma.user.findFirst({
      where: {
        id: numericId,
        ...(includeInactive ? {} : { deletedAt: null }),
      },
      select: USER_SELECT,
    });

    if (!user) {
      throw new NotFoundError(this.modelName);
    }

    return this.serializeUser(user);
  }

  async create(data: CreateUserInput, actor?: ActorContext) {
    await this.ensureEmailAvailable(data.email);

    const employee = await this.prisma.employee.findUnique({ where: { id: data.employeeId } });
    if (!employee) {
      throw new ValidationError('Сотрудник с указанным ID не найден');
    }

    const employeeUser = await this.prisma.user.findUnique({ where: { employeeId: data.employeeId } });
    if (employeeUser) {
      if (employeeUser.deletedAt) {
        throw new ConflictError('У сотрудника уже есть деактивированная учётная запись. Восстановите её вместо создания новой.');
      }
      throw new ConflictError('К этому сотруднику уже привязан пользователь');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const createdUser = await this.safeQuery(() =>
      this.prisma.user.create({
        data: {
          email: data.email.trim(),
          passwordHash,
          role: data.role,
          employeeId: data.employeeId,
        },
        select: USER_SELECT,
      })
    );

    await this.logAction(actor?.id, 'USER_CREATED', {
      userId: createdUser.id,
      email: createdUser.email,
      role: createdUser.role,
      employeeId: createdUser.employeeId,
    });

    return this.serializeUser(createdUser);
  }

  async update(id: number, data: UpdateUserInput, actor?: ActorContext) {
    const numericId = this.validateNumericId(id);
    const existingUser = await this.prisma.user.findUnique({ where: { id: numericId } });

    if (!existingUser) {
      throw new NotFoundError(this.modelName);
    }

    this.assertCanManageTarget(actor, existingUser, 'изменять');

    if (data.email && data.email !== existingUser.email) {
      await this.ensureEmailAvailable(data.email, existingUser.id);
    }

    const updateData: Prisma.UserUpdateInput = {};
    if (data.email) updateData.email = data.email.trim();
    if (data.role) updateData.role = data.role;
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    const updatedUser = await this.safeQuery(() =>
      this.prisma.user.update({
        where: { id: numericId },
        data: updateData,
        select: USER_SELECT,
      })
    );

    await this.logAction(actor?.id, 'USER_UPDATED', {
      userId: updatedUser.id,
      changes: {
        email: data.email,
        role: data.role,
        passwordChanged: Boolean(data.password),
      },
    });

    return this.serializeUser(updatedUser);
  }

  async softDelete(id: number, actor: ActorContext) {
    const numericId = this.validateNumericId(id);
    const existingUser = await this.prisma.user.findUnique({ where: { id: numericId } });

    if (!existingUser) {
      throw new NotFoundError(this.modelName);
    }

    if (actor.id === numericId) {
      throw new ValidationError('Нельзя деактивировать свою учётную запись');
    }

    this.assertCanManageTarget(actor, existingUser, 'деактивировать');

    if (existingUser.deletedAt) {
      throw new ConflictError('Учётная запись уже деактивирована');
    }

    const updatedUser = await this.safeQuery(() =>
      this.prisma.user.update({
        where: { id: numericId },
        data: {
          deletedAt: new Date(),
          telegramChatId: null,
        },
        select: USER_SELECT,
      })
    );

    await this.logAction(actor.id, 'USER_DEACTIVATED', {
      userId: updatedUser.id,
      email: updatedUser.email,
    });

    return this.serializeUser(updatedUser);
  }

  async restore(id: number, actor: ActorContext) {
    const numericId = this.validateNumericId(id);
    const existingUser = await this.prisma.user.findUnique({ where: { id: numericId } });

    if (!existingUser) {
      throw new NotFoundError(this.modelName);
    }

    this.assertCanManageTarget(actor, existingUser, 'восстанавливать');

    if (!existingUser.deletedAt) {
      throw new ConflictError('Учётная запись уже активна');
    }

    const updatedUser = await this.safeQuery(() =>
      this.prisma.user.update({
        where: { id: numericId },
        data: { deletedAt: null },
        select: USER_SELECT,
      })
    );

    await this.logAction(actor.id, 'USER_RESTORED', {
      userId: updatedUser.id,
      email: updatedUser.email,
    });

    return this.serializeUser(updatedUser);
  }

  async listAvailableEmployees() {
    return this.prisma.employee.findMany({
      where: {
        user: null,
        fireDate: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        position: true,
      },
      orderBy: { lastName: 'asc' },
    });
  }

  private buildWhere(params: UserFilters): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = {};

    if (params.role) {
      where.role = params.role;
    }

    if (!params.status || params.status === 'ACTIVE') {
      where.deletedAt = null;
    } else if (params.status === 'INACTIVE') {
      where.deletedAt = { not: null };
    }

    if (params.search) {
      const search = params.search.trim();
      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { employee: { firstName: { contains: search, mode: 'insensitive' } } },
          { employee: { lastName: { contains: search, mode: 'insensitive' } } },
          { employee: { position: { contains: search, mode: 'insensitive' } } },
        ];
      }
    }

    return where;
  }

  private serializeUser(user: UserRecord) {
    return {
      ...user,
      status: user.deletedAt ? 'INACTIVE' as const : 'ACTIVE' as const,
    };
  }

  private assertCanManageTarget(actor: ActorContext | undefined, target: Pick<User, 'id' | 'role'>, action: string) {
    if (!actor) {
      return;
    }

    if (actor.role !== 'DEVELOPER' && PROTECTED_ROLES.includes(target.role)) {
      throw new AuthorizationError(`Недостаточно прав, чтобы ${action} эту учётную запись`);
    }
  }

  private async ensureEmailAvailable(email: string, excludeId?: number) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: email.trim(),
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });

    if (!existingUser) {
      return;
    }

    if (existingUser.deletedAt) {
      throw new ConflictError('Логин уже занят деактивированной учётной записью. Восстановите её вместо создания новой.');
    }

    throw new ConflictError('Пользователь с таким логином уже существует');
  }

  private async logAction(actorId: number | undefined, action: string, details?: Prisma.InputJsonValue) {
    if (!actorId) {
      return;
    }

    await this.prisma.actionLog.create({
      data: {
        userId: actorId,
        action,
        details,
      },
    });
  }
}

export const userService = new UserServiceClass();