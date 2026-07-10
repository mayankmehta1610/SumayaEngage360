import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmployeeStatus, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
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

  findAll(tenantId: string, status?: EmployeeStatus) {
    return this.prisma.employee.findMany({
      where: { tenantId, ...(status ? { status } : {}) },
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
        department: { select: { name: true } },
      },
      orderBy: { employeeCode: 'asc' },
    });
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
