import { Injectable } from '@nestjs/common';
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

  assignGoal(tenantId: string, dto: { employeeId: string; title: string; target?: string; dueDate?: string; cycleId?: string }) {
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

  updateProgress(tenantId: string, goalId: string, progress: number) {
    return this.prisma.employeeGoal.updateMany({
      where: { id: goalId, tenantId },
      data: { progress: Math.min(100, Math.max(0, progress)) },
    });
  }
}
