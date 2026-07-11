import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppraisalStatus, EmployeeStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateCycleDto,
  FinalizeDto,
  ManagerReviewDto,
  SelfReviewDto,
} from './appraisals.dto';

@Injectable()
export class AppraisalsService {
  constructor(private readonly prisma: PrismaService) {}

  createCycle(tenantId: string, dto: CreateCycleDto) {
    return this.prisma.appraisalCycle.create({
      data: {
        tenantId,
        name: dto.name,
        frequency: dto.frequency,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        template: dto.template as any,
      },
    });
  }

  listCycles(tenantId: string) {
    return this.prisma.appraisalCycle.findMany({
      where: { tenantId },
      include: { _count: { select: { appraisals: true } } },
      orderBy: { startDate: 'desc' },
    });
  }

  // Creates an appraisal for every active employee. Appraiser = reporting
  // manager (the project manager assigned on allocation); reviewer = the
  // manager's manager where one exists.
  async launchCycle(tenantId: string, cycleId: string) {
    const cycle = await this.prisma.appraisalCycle.findFirst({
      where: { id: cycleId, tenantId, isActive: true },
    });
    if (!cycle) throw new NotFoundException('Cycle not found');

    const employees = await this.prisma.employee.findMany({
      where: { tenantId, status: EmployeeStatus.ACTIVE },
      include: { manager: true },
    });
    let created = 0;
    for (const emp of employees) {
      const existing = await this.prisma.appraisal.findUnique({
        where: { cycleId_employeeId: { cycleId, employeeId: emp.id } },
      });
      if (existing) continue;
      await this.prisma.appraisal.create({
        data: {
          tenantId,
          cycleId,
          employeeId: emp.id,
          appraiserId: emp.managerId,
          reviewerId: emp.manager?.managerId ?? null,
        },
      });
      created++;
    }
    return { created, totalActive: employees.length };
  }

  async mine(tenantId: string, userId: string) {
    const emp = await this.employeeForUser(userId);
    return this.prisma.appraisal.findMany({
      where: { tenantId, employeeId: emp.id },
      include: { cycle: { select: { name: true, template: true, endDate: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Appraisals where I'm the appraiser or reviewer.
  async myTeam(tenantId: string, userId: string) {
    const emp = await this.employeeForUser(userId);
    return this.prisma.appraisal.findMany({
      where: {
        tenantId,
        OR: [{ appraiserId: emp.id }, { reviewerId: emp.id }],
      },
      include: {
        cycle: { select: { name: true, template: true } },
        employee: {
          select: {
            employeeCode: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
  }

  async submitSelf(tenantId: string, userId: string, id: string, dto: SelfReviewDto) {
    const emp = await this.employeeForUser(userId);
    const appraisal = await this.get(tenantId, id);
    if (appraisal.employeeId !== emp.id) {
      throw new ForbiddenException('Not your appraisal');
    }
    if (appraisal.status !== AppraisalStatus.SELF_REVIEW) {
      throw new BadRequestException('Self review is not open');
    }
    return this.prisma.appraisal.update({
      where: { id },
      data: {
        selfReview: dto.review as any,
        status: AppraisalStatus.MANAGER_REVIEW,
      },
    });
  }

  async submitManager(
    tenantId: string,
    userId: string,
    id: string,
    dto: ManagerReviewDto,
  ) {
    const emp = await this.employeeForUser(userId);
    const appraisal = await this.get(tenantId, id);
    if (appraisal.appraiserId !== emp.id) {
      throw new ForbiddenException('You are not the appraiser');
    }
    if (appraisal.status !== AppraisalStatus.MANAGER_REVIEW) {
      throw new BadRequestException('Manager review is not open');
    }
    return this.prisma.appraisal.update({
      where: { id },
      data: {
        managerReview: dto.review as any,
        finalRating: dto.rating,
        // reviewer step only when one is assigned
        status: appraisal.reviewerId
          ? AppraisalStatus.REVIEWER_REVIEW
          : AppraisalStatus.COMPLETED,
      },
    });
  }

  async finalize(tenantId: string, userId: string, id: string, dto: FinalizeDto) {
    const emp = await this.employeeForUser(userId);
    const appraisal = await this.get(tenantId, id);
    if (appraisal.reviewerId !== emp.id) {
      throw new ForbiddenException('You are not the reviewer');
    }
    if (appraisal.status !== AppraisalStatus.REVIEWER_REVIEW) {
      throw new BadRequestException('Reviewer step is not open');
    }
    return this.prisma.appraisal.update({
      where: { id },
      data: {
        finalRating: dto.finalRating,
        outcome: dto.outcome as any,
        status: AppraisalStatus.COMPLETED,
      },
    });
  }

  private async get(tenantId: string, id: string) {
    const a = await this.prisma.appraisal.findFirst({ where: { id, tenantId } });
    if (!a) throw new NotFoundException('Appraisal not found');
    return a;
  }

  private async employeeForUser(userId: string) {
    const emp = await this.prisma.employee.findUnique({ where: { userId } });
    if (!emp) throw new NotFoundException('No employee record for this user');
    return emp;
  }
}
