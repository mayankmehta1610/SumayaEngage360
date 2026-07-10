import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePolicyDto } from './onboarding.dto';

@Injectable()
export class PoliciesService {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreatePolicyDto) {
    return this.prisma.policy.create({
      data: { tenantId, ...dto, version: dto.version ?? '1.0' },
    });
  }

  list(tenantId: string) {
    return this.prisma.policy.findMany({
      where: { tenantId, isActive: true },
      include: { _count: { select: { acknowledgements: true } } },
    });
  }

  async acknowledgements(tenantId: string, policyId: string) {
    const policy = await this.prisma.policy.findFirst({
      where: { id: policyId, tenantId },
    });
    if (!policy) throw new NotFoundException('Policy not found');
    return this.prisma.policyAcknowledgement.findMany({
      where: { policyId },
      include: {
        employee: {
          select: {
            employeeCode: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
  }

  // Logged-in employees acknowledge policies post-onboarding too.
  async acknowledgeAsEmployee(tenantId: string, userId: string, policyId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { userId } });
    if (!employee) throw new NotFoundException('No employee record');
    const policy = await this.prisma.policy.findFirst({
      where: { id: policyId, tenantId, isActive: true },
    });
    if (!policy) throw new NotFoundException('Policy not found');
    return this.prisma.policyAcknowledgement.upsert({
      where: {
        policyId_employeeId_version: {
          policyId,
          employeeId: employee.id,
          version: policy.version,
        },
      },
      create: {
        tenantId,
        policyId,
        employeeId: employee.id,
        version: policy.version,
      },
      update: {},
    });
  }
}
