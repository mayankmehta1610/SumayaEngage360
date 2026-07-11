import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  goalLibrary(tenantId: string) {
    return this.prisma.goalLibrary.findMany({ where: { tenantId } });
  }

  createGoalTemplate(tenantId: string, dto: { title: string; category?: string; kpis?: unknown }) {
    return this.prisma.goalLibrary.create({ data: { tenantId, ...dto, kpis: dto.kpis as any } });
  }

  kpis(tenantId: string) {
    return this.prisma.kpiLibrary.findMany({ where: { tenantId }, orderBy: { code: 'asc' } });
  }

  createKpi(tenantId: string, dto: { code: string; name: string; unit?: string }) {
    return this.prisma.kpiLibrary.create({ data: { tenantId, ...dto } });
  }

  competencies(tenantId: string) {
    return this.prisma.competencyLibrary.findMany({ where: { tenantId }, orderBy: { code: 'asc' } });
  }

  createCompetency(tenantId: string, dto: { code: string; name: string; level?: number }) {
    return this.prisma.competencyLibrary.create({ data: { tenantId, ...dto } });
  }

  employeeGoals(tenantId: string, employeeId?: string) {
    return this.prisma.employeeGoal.findMany({
      where: { tenantId, ...(employeeId ? { employeeId } : {}) },
      include: { employee: { select: { employeeCode: true, user: { select: { firstName: true, lastName: true } } } } },
    });
  }

  async assignGoal(tenantId: string, dto: { employeeId: string; title: string; target?: string; dueDate?: string; cycleId?: string }) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, tenantId },
      select: { id: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    return this.prisma.employeeGoal.create({
      data: {
        tenantId,
        employeeId: dto.employeeId,
        title: dto.title,
        target: dto.target,
        cycleId: dto.cycleId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    });
  }

  async managerGoals(tenantId: string, userId: string) {
    const manager = await this.prisma.employee.findFirst({
      where: { tenantId, userId },
      select: { id: true },
    });
    if (!manager) return [];
    return this.prisma.employeeGoal.findMany({
      where: { tenantId, employee: { managerId: manager.id } },
      include: { employee: { select: { employeeCode: true, user: { select: { firstName: true, lastName: true } } } } },
    });
  }

  async assertManagerCanAssign(tenantId: string, userId: string, employeeId: string) {
    const target = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
      select: { manager: { select: { userId: true } } },
    });
    if (!target) throw new NotFoundException('Employee not found');
    if (target.manager?.userId !== userId) {
      throw new ForbiddenException('Managers can assign goals only to direct reports');
    }
  }

  async updateProgress(
    tenantId: string,
    goalId: string,
    progress: number,
    userId: string,
    privileged: boolean,
  ) {
    const goal = await this.prisma.employeeGoal.findFirst({
      where: { id: goalId, tenantId },
      select: { employee: { select: { userId: true, manager: { select: { userId: true } } } } },
    });
    if (!goal) throw new NotFoundException('Goal not found');
    if (
      !privileged &&
      goal.employee.userId !== userId &&
      goal.employee.manager?.userId !== userId
    ) {
      throw new ForbiddenException('Goal is outside your assigned scope');
    }
    return this.prisma.employeeGoal.update({
      where: { id: goalId },
      data: { progress: Math.min(100, Math.max(0, progress)) },
    });
  }
}
