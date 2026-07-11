import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ManpowerService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.manpowerRequest.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(tenantId: string, requestedBy: string, dto: {
    title: string; headcount: number; departmentId?: string; budget?: number; justification?: string;
  }) {
    return this.prisma.manpowerRequest.create({
      data: { tenantId, requestedBy, ...dto, budget: dto.budget },
    });
  }

  async submit(tenantId: string, id: string) {
    const req = await this.find(tenantId, id);
    if (req.status !== 'DRAFT') throw new BadRequestException('Already submitted');
    return this.prisma.manpowerRequest.update({ where: { id }, data: { status: 'SUBMITTED' } });
  }

  async approve(tenantId: string, id: string, approvedBy: string) {
    const req = await this.find(tenantId, id);
    if (req.status !== 'SUBMITTED') throw new BadRequestException('Not in submitted state');
    return this.prisma.manpowerRequest.update({
      where: { id },
      data: { status: 'APPROVED', approvedBy },
    });
  }

  async reject(tenantId: string, id: string) {
    const req = await this.find(tenantId, id);
    return this.prisma.manpowerRequest.update({ where: { id }, data: { status: 'REJECTED' } });
  }

  private async find(tenantId: string, id: string) {
    const req = await this.prisma.manpowerRequest.findFirst({ where: { id, tenantId } });
    if (!req) throw new NotFoundException('Manpower request not found');
    return req;
  }
}
