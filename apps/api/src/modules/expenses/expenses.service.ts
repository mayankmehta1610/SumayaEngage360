import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, employeeId?: string) {
    return this.prisma.expenseClaim.findMany({
      where: { tenantId, ...(employeeId ? { employeeId } : {}) },
      include: { lines: true, employee: { select: { employeeCode: true, user: { select: { firstName: true, lastName: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(tenantId: string, employeeId: string, dto: { title: string; lines: { date: string; category: string; amount: number; description?: string }[] }) {
    const total = dto.lines.reduce((s, l) => s + l.amount, 0);
    return this.prisma.expenseClaim.create({
      data: {
        tenantId,
        employeeId,
        title: dto.title,
        totalAmount: total,
        lines: {
          create: dto.lines.map((l) => ({
            date: new Date(l.date),
            category: l.category,
            amount: l.amount,
            description: l.description,
          })),
        },
      },
      include: { lines: true },
    });
  }

  async submit(tenantId: string, claimId: string, employeeId: string) {
    const claim = await this.prisma.expenseClaim.findFirst({ where: { id: claimId, tenantId, employeeId } });
    if (!claim) throw new NotFoundException('Claim not found');
    if (claim.status !== 'DRAFT') throw new BadRequestException('Claim already submitted');
    return this.prisma.expenseClaim.update({
      where: { id: claimId },
      data: { status: 'SUBMITTED', submittedAt: new Date() },
      include: { lines: true },
    });
  }

  async approve(tenantId: string, claimId: string) {
    const claim = await this.prisma.expenseClaim.findFirst({ where: { id: claimId, tenantId } });
    if (!claim) throw new NotFoundException('Claim not found');
    if (claim.status !== 'SUBMITTED') throw new BadRequestException('Claim not in submitted state');
    return this.prisma.expenseClaim.update({
      where: { id: claimId },
      data: { status: 'APPROVED', approvedAt: new Date() },
      include: { lines: true },
    });
  }

  async reject(tenantId: string, claimId: string) {
    const claim = await this.prisma.expenseClaim.findFirst({ where: { id: claimId, tenantId } });
    if (!claim) throw new NotFoundException('Claim not found');
    return this.prisma.expenseClaim.update({
      where: { id: claimId },
      data: { status: 'REJECTED' },
      include: { lines: true },
    });
  }
}
