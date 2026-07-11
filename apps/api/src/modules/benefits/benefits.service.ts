import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BenefitsService {
  constructor(private readonly prisma: PrismaService) {}

  plans(tenantId: string) {
    return this.prisma.benefitPlan.findMany({
      where: { tenantId, isActive: true },
      include: { _count: { select: { enrollments: true } } },
    });
  }

  createPlan(tenantId: string, dto: { code: string; name: string; category: string; description?: string }) {
    return this.prisma.benefitPlan.create({ data: { tenantId, ...dto } });
  }

  enrollments(tenantId: string, planId?: string) {
    return this.prisma.benefitEnrollment.findMany({
      where: { tenantId, ...(planId ? { planId } : {}) },
      include: {
        plan: true,
        employee: { select: { employeeCode: true, user: { select: { firstName: true, lastName: true } } } },
      },
    });
  }

  async enroll(tenantId: string, planId: string, employeeId: string) {
    const plan = await this.prisma.benefitPlan.findFirst({ where: { id: planId, tenantId } });
    if (!plan) throw new NotFoundException('Benefit plan not found');
    return this.prisma.benefitEnrollment.upsert({
      where: { planId_employeeId: { planId, employeeId } },
      create: { tenantId, planId, employeeId },
      update: { status: 'ACTIVE' },
    });
  }

  myEnrollments(tenantId: string, employeeId: string) {
    return this.prisma.benefitEnrollment.findMany({
      where: { tenantId, employeeId, status: 'ACTIVE' },
      include: { plan: true },
    });
  }
}
