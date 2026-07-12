import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmployeeStatus, Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { contains, paginatedResponse, parseFilterJson, parseSortDir } from '../../common/http/list-sort-filter';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AddSkillsDto,
  CreateEmployeeDto,
  SalaryStructureDto,
  UpdateEmployeeDto,
} from './employees.dto';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async nextEmployeeCode(tenantId: string) {
    const count = await this.prisma.employee.count({ where: { tenantId } });
    return `EMP-${String(count + 1).padStart(4, '0')}`;
  }

  // Direct hire (outside the ATS flow) — creates the login + employee record.
  async create(tenantId: string, dto: CreateEmployeeDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.users.findUnique({
      where: { tenantId_email: { tenantId, email } },
    });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }
    const employeeCode = await this.nextEmployeeCode(tenantId);
    return this.prisma.employee.create({
      data: {
        tenantId,
        employeeCode,
        designation: dto.designation,
        department: dto.departmentId
          ? { connect: { id: dto.departmentId } }
          : undefined,
        manager: dto.managerId ? { connect: { id: dto.managerId } } : undefined,
        joinDate: dto.joinDate ? new Date(dto.joinDate) : null,
        location: dto.location,
        status: EmployeeStatus.ONBOARDING,
        user: {
          create: {
            tenantId,
            email,
            passwordHash: await bcrypt.hash(
              dto.password ?? randomBytes(16).toString('hex'),
              10,
            ),
            firstName: dto.firstName,
            lastName: dto.lastName,
            roles: [Role.EMPLOYEE],
          },
        },
      },
      include: { user: { select: { email: true, firstName: true, lastName: true } } },
    });
  }

  async findAll(
    tenantId: string,
    statuses?: EmployeeStatus[],
    departmentIds?: string[],
    page?: number,
    pageSize?: number,
    sortBy?: string,
    sortDir?: string,
    filter?: string,
  ) {
    const filters = parseFilterJson(filter);
    const where: Prisma.EmployeeWhereInput = {
      tenantId,
      ...(statuses?.length === 1 ? { status: statuses[0] } : {}),
      ...(statuses && statuses.length > 1 ? { status: { in: statuses } } : {}),
      ...(departmentIds?.length ? { departmentId: { in: departmentIds } } : {}),
    };
    if (filters.code) where.employeeCode = contains(filters.code);
    if (filters.designation) where.designation = contains(filters.designation);
    if (filters.status) where.status = filters.status.toUpperCase() as EmployeeStatus;
    if (filters.department) where.department = { name: contains(filters.department) };
    if (filters.name) {
      where.OR = [
        { user: { firstName: contains(filters.name) } },
        { user: { lastName: contains(filters.name) } },
      ];
    }
    if (filters.email) where.user = { email: contains(filters.email) };
    if (filters.__search) {
      const q = filters.__search;
      where.OR = [
        { employeeCode: contains(q) },
        { designation: contains(q) },
        { user: { firstName: contains(q) } },
        { user: { lastName: contains(q) } },
        { user: { email: contains(q) } },
        { department: { name: contains(q) } },
      ];
    }
    const include = {
      user: { select: { email: true, firstName: true, lastName: true } },
      department: { select: { name: true } },
    };
    const dir = parseSortDir(sortDir);
    const orderBy: Prisma.EmployeeOrderByWithRelationInput = (() => {
      switch (sortBy) {
        case 'name': return { user: { firstName: dir } };
        case 'email': return { user: { email: dir } };
        case 'designation': return { designation: dir };
        case 'department': return { department: { name: dir } };
        case 'joined': return { joinDate: dir };
        case 'status': return { status: dir };
        default: return { employeeCode: dir };
      }
    })();
    const paginated = page !== undefined || pageSize !== undefined;
    if (!paginated) {
      return this.prisma.employee.findMany({ where, include, orderBy });
    }
    const p = Math.max(1, page ?? 1);
    const ps = Math.min(200, Math.max(1, pageSize ?? 50));
    const [data, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        include,
        orderBy,
        skip: (p - 1) * ps,
        take: ps,
      }),
      this.prisma.employee.count({ where }),
    ]);
    return paginatedResponse(data, total, p, ps, sortBy, dir);
  }

  async findOne(tenantId: string, id: string) {
    const emp = await this.prisma.employee.findFirst({
      where: { id, tenantId },
      include: {
        user: { select: { email: true, firstName: true, lastName: true, roles: true } },
        department: true,
        manager: { include: { user: { select: { firstName: true, lastName: true } } } },
        skills: { include: { skill: true } },
        allocations: { where: { endDate: null }, include: { project: true } },
        assetAssignments: { where: { returnedAt: null }, include: { asset: true } },
        // NOTE: backgroundCheck deliberately excluded — hidden from general views;
        // HR accesses it through the BGC endpoints only.
      },
    });
    if (!emp) throw new NotFoundException('Employee not found');
    return emp;
  }

  async update(tenantId: string, id: string, dto: UpdateEmployeeDto) {
    await this.ensureExists(tenantId, id);
    return this.prisma.employee.update({ where: { id }, data: dto });
  }

  async addSkills(tenantId: string, id: string, dto: AddSkillsDto) {
    await this.ensureExists(tenantId, id);
    for (const name of dto.skills) {
      const skill = await this.prisma.skill.upsert({
        where: { tenantId_name: { tenantId, name } },
        create: { tenantId, name },
        update: {},
      });
      await this.prisma.employeeSkill.upsert({
        where: { employeeId_skillId: { employeeId: id, skillId: skill.id } },
        create: { employeeId: id, skillId: skill.id, yearsOfExp: dto.yearsOfExp },
        update: {},
      });
    }
    return this.prisma.employeeSkill.findMany({
      where: { employeeId: id },
      include: { skill: true },
    });
  }

  // Salary: closing the previous structure keeps a full revision history
  // (offered vs current is visible by comparing isOffered rows to the latest).
  async addSalaryStructure(tenantId: string, id: string, dto: SalaryStructureDto) {
    await this.ensureExists(tenantId, id);
    const effectiveFrom = new Date(dto.effectiveFrom);
    return this.prisma.$transaction(async (tx) => {
      await tx.salaryStructure.updateMany({
        where: { tenantId, employeeId: id, effectiveTo: null, isOffered: false },
        data: { effectiveTo: effectiveFrom },
      });
      return tx.salaryStructure.create({
        data: {
          tenantId,
          employeeId: id,
          annualCtc: dto.annualCtc,
          components: dto.components as any,
          effectiveFrom,
        },
      });
    });
  }

  salaryHistory(tenantId: string, id: string) {
    return this.prisma.salaryStructure.findMany({
      where: { tenantId, employeeId: id },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  directory(tenantId: string) {
    return this.prisma.employee.findMany({
      where: { tenantId, status: { in: ['ACTIVE', 'ON_NOTICE', 'ONBOARDING'] } },
      select: {
        id: true,
        employeeCode: true,
        designation: true,
        user: { select: { firstName: true, lastName: true } },
        department: { select: { name: true } },
      },
      orderBy: [{ user: { lastName: 'asc' } }, { user: { firstName: 'asc' } }],
    });
  }

  async directReports(tenantId: string, managerUserId: string) {
    const manager = await this.prisma.employee.findFirst({
      where: { tenantId, userId: managerUserId },
      select: { id: true },
    });
    if (!manager) return [];
    return this.prisma.employee.findMany({
      where: {
        tenantId,
        managerId: manager.id,
        status: { in: ['ACTIVE', 'ON_NOTICE', 'ONBOARDING'] },
      },
      select: {
        id: true,
        employeeCode: true,
        designation: true,
        user: { select: { firstName: true, lastName: true } },
        department: { select: { name: true } },
      },
      orderBy: { employeeCode: 'asc' },
    });
  }

  async byUserId(userId: string) {
    const emp = await this.prisma.employee.findUnique({ where: { userId } });
    if (!emp) throw new NotFoundException('No employee record for this user');
    return emp;
  }

  private async ensureExists(tenantId: string, id: string) {
    const emp = await this.prisma.employee.findFirst({ where: { id, tenantId } });
    if (!emp) throw new NotFoundException('Employee not found');
    return emp;
  }
}
