import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PreboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async getPersonalData(tenantId: string, employeeId: string) {
    return this.prisma.employeePersonalData.findFirst({ where: { tenantId, employeeId } });
  }

  upsertPersonalData(tenantId: string, employeeId: string, dto: Record<string, unknown>) {
    return this.prisma.employeePersonalData.upsert({
      where: { employeeId },
      create: { tenantId, employeeId, ...this.pick(dto) },
      update: this.pick(dto),
    });
  }

  tasks(tenantId: string, employeeId?: string) {
    return this.prisma.onboardingTask.findMany({
      where: { tenantId, ...(employeeId ? { employeeId } : {}) },
      include: { employee: { select: { employeeCode: true, user: { select: { firstName: true, lastName: true } } } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createTask(tenantId: string, dto: { employeeId: string; taskType: string; title: string; assigneeId?: string; dueDate?: string }) {
    await this.assertEmployee(tenantId, dto.employeeId);
    return this.prisma.onboardingTask.create({
      data: {
        tenantId,
        employeeId: dto.employeeId,
        taskType: dto.taskType,
        title: dto.title,
        assigneeId: dto.assigneeId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    });
  }

  async completeTask(tenantId: string, taskId: string) {
    const task = await this.prisma.onboardingTask.findFirst({ where: { id: taskId, tenantId } });
    if (!task) throw new NotFoundException('Task not found');
    return this.prisma.onboardingTask.update({
      where: { id: taskId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
  }

  async initDefaultTasks(tenantId: string, employeeId: string) {
    await this.assertEmployee(tenantId, employeeId);
    const existing = await this.prisma.onboardingTask.count({ where: { tenantId, employeeId } });
    if (existing > 0) return this.tasks(tenantId, employeeId);
    const defaults = [
      { taskType: 'IT_ACCESS', title: 'Provision IT access (email, laptop, SSO)' },
      { taskType: 'BUDDY', title: 'Assign onboarding buddy' },
      { taskType: 'INDUCTION', title: 'Complete induction session' },
    ];
    await this.prisma.onboardingTask.createMany({
      data: defaults.map((d) => ({ tenantId, employeeId, ...d })),
    });
    return this.tasks(tenantId, employeeId);
  }

  private async assertEmployee(tenantId: string, employeeId: string) {
    const employee = await this.prisma.employee.findFirst({ where: { id: employeeId, tenantId }, select: { id: true } });
    if (!employee) throw new NotFoundException('Employee not found');
  }

  private pick(dto: Record<string, unknown>) {
    const fields = [
      'emergencyName', 'emergencyPhone', 'emergencyRelation',
      'bankName', 'bankAccountNo', 'bankIfsc', 'pan', 'aadhaarLast4', 'address',
    ];
    const data: Record<string, unknown> = {};
    for (const f of fields) {
      if (dto[f] !== undefined) data[f] = f === 'address' ? dto[f] as Prisma.InputJsonValue : dto[f];
    }
    return data;
  }
}
