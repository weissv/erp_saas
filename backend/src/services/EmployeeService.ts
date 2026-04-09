// src/services/EmployeeService.ts
// Сервис для работы с сотрудниками

import { Employee, Prisma } from '@prisma/client';
import { BaseService, PaginationParams, SortParams, PaginatedResult } from './BaseService';
import { NotFoundError } from '../utils/errors';
import bcrypt from 'bcryptjs';

export interface EmployeeFilters {
  position?: string;
  lastName?: string;
  hasUser?: boolean;
}

export interface CreateEmployeeInput {
  firstName: string;
  lastName: string;
  middleName?: string;
  birthDate?: string | Date;
  position: string;
  rate: number;
  hireDate: string | Date;
  fireDate?: string | Date;
  contractEndDate?: string | Date;
  medicalCheckupDate?: string | Date;
  attestationDate?: string | Date;
  user?: {
    email: string;
    password: string;
    role: string;
  };
}

export interface UpdateEmployeeInput extends Partial<Omit<CreateEmployeeInput, 'user'>> {}

export interface EmployeeWithUser extends Employee {
  user: { id: number; email: string; role: string } | null;
}

class EmployeeServiceClass extends BaseService<Employee, CreateEmployeeInput, UpdateEmployeeInput> {
  protected get modelName() {
    return 'Сотрудник';
  }

  protected get allowedSortFields() {
    return ['id', 'firstName', 'lastName', 'position', 'hireDate', 'rate', 'createdAt'];
  }

  /**
   * Получить список сотрудников с фильтрами и пагинацией
   */
  async findMany(
    params: PaginationParams & SortParams & EmployeeFilters
  ): Promise<PaginatedResult<EmployeeWithUser>> {
    const pagination = this.buildPagination(params);
    const orderBy = this.buildOrderBy(params);
    
    const where: Prisma.EmployeeWhereInput = {};
    
    if (params.position) {
      where.position = { contains: params.position, mode: 'insensitive' };
    }
    if (params.lastName) {
      where.lastName = { contains: params.lastName, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy,
        include: { 
          user: { 
            select: { id: true, email: true, role: true } 
          } 
        },
      }),
      this.prisma.employee.count({ where }),
    ]);

    return this.formatPaginatedResult(items as EmployeeWithUser[], total, pagination);
  }

  /**
   * Получить сотрудника по ID
   */
  async findById(id: number): Promise<EmployeeWithUser> {
    const numericId = this.validateNumericId(id);
    
    const employee = await this.prisma.employee.findUnique({
      where: { id: numericId },
      include: { 
        user: { 
          select: { id: true, email: true, role: true } 
        } 
      },
    });

    if (!employee) {
      throw new NotFoundError(this.modelName);
    }

    return employee as EmployeeWithUser;
  }

  /**
   * Создать сотрудника
   */
  async create(data: CreateEmployeeInput): Promise<{ emp: Employee; usr: any | null }> {
    const { user, ...employeeData } = data;

    return this.prisma.$transaction(async (tx) => {
      const emp = await tx.employee.create({
        data: {
          firstName: employeeData.firstName,
          lastName: employeeData.lastName,
          middleName: employeeData.middleName,
          birthDate: employeeData.birthDate ? this.parseDate(employeeData.birthDate) : undefined,
          position: employeeData.position,
          rate: employeeData.rate,
          hireDate: this.parseDate(employeeData.hireDate),
          fireDate: employeeData.fireDate ? this.parseDate(employeeData.fireDate) : undefined,
          contractEndDate: employeeData.contractEndDate ? this.parseDate(employeeData.contractEndDate) : undefined,
          medicalCheckupDate: employeeData.medicalCheckupDate ? this.parseDate(employeeData.medicalCheckupDate) : undefined,
          attestationDate: employeeData.attestationDate ? this.parseDate(employeeData.attestationDate) : undefined,
        },
      });

      let usr = null;
      if (user) {
        const passwordHash = await bcrypt.hash(user.password, 10);
        usr = await tx.user.create({
          data: {
            email: user.email,
            passwordHash,
            role: user.role as any,
            employeeId: emp.id,
          },
        });
      }

      return { emp, usr };
    });
  }

  /**
   * Обновить данные сотрудника
   */
  async update(id: number, data: UpdateEmployeeInput): Promise<Employee> {
    const numericId = this.validateNumericId(id);
    
    // Проверяем существование
    await this.findById(numericId);

    const updateData: Prisma.EmployeeUpdateInput = {};
    
    if (data.firstName) updateData.firstName = data.firstName;
    if (data.lastName) updateData.lastName = data.lastName;
    if (data.middleName !== undefined) updateData.middleName = data.middleName;
    if (data.birthDate !== undefined) updateData.birthDate = data.birthDate ? this.parseDate(data.birthDate) : null;
    if (data.position) updateData.position = data.position;
    if (data.rate !== undefined) updateData.rate = data.rate;
    if (data.hireDate) updateData.hireDate = this.parseDate(data.hireDate);
    if (data.fireDate !== undefined) updateData.fireDate = data.fireDate ? this.parseDate(data.fireDate) : null;
    if (data.contractEndDate !== undefined) updateData.contractEndDate = data.contractEndDate ? this.parseDate(data.contractEndDate) : null;
    if (data.medicalCheckupDate !== undefined) updateData.medicalCheckupDate = data.medicalCheckupDate ? this.parseDate(data.medicalCheckupDate) : null;
    if (data.attestationDate !== undefined) updateData.attestationDate = data.attestationDate ? this.parseDate(data.attestationDate) : null;

    return this.safeQuery(() =>
      this.prisma.employee.update({
        where: { id: numericId },
        data: updateData,
      })
    );
  }

  /**
   * Удалить сотрудника
   */
  async delete(id: number): Promise<void> {
    const numericId = this.validateNumericId(id);
    
    // Удаляем связанного пользователя
    await this.prisma.user.deleteMany({
      where: { employeeId: numericId },
    });

    await this.safeQuery(() =>
      this.prisma.employee.delete({ where: { id: numericId } })
    );
  }

  /**
   * Получить напоминания о медосмотрах и аттестациях
   */
  async getReminders(daysAhead: number = 30) {
    const futureDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);

    const [medicalCheckups, attestations] = await Promise.all([
      this.prisma.employee.findMany({
        where: {
          fireDate: null,
          medicalCheckupDate: { lte: futureDate },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          position: true,
          medicalCheckupDate: true,
        },
        orderBy: { medicalCheckupDate: 'asc' },
      }),
      this.prisma.employee.findMany({
        where: {
          fireDate: null,
          attestationDate: { lte: futureDate },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          position: true,
          attestationDate: true,
        },
        orderBy: { attestationDate: 'asc' },
      }),
    ]);

    const calcDaysUntil = (date: Date) => 
      Math.ceil((new Date(date).getTime() - Date.now()) / (24 * 60 * 60 * 1000));

    return {
      medicalCheckups: medicalCheckups.map((e) => ({
        ...e,
        daysUntil: calcDaysUntil(e.medicalCheckupDate!),
      })),
      attestations: attestations.map((e) => ({
        ...e,
        daysUntil: calcDaysUntil(e.attestationDate!),
      })),
    };
  }

  /**
   * Получить всех учителей (для выбора в формах)
   */
  async getTeachers() {
    return this.prisma.employee.findMany({
      where: {
        fireDate: null,
        user: {
          role: { in: ['TEACHER', 'DIRECTOR', 'DEPUTY'] },
        },
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
}

export const EmployeeService = new EmployeeServiceClass();
