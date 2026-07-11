import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ReportsService } from '../reports/reports.service';

@Injectable()
export class ExportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reports: ReportsService,
  ) {}

  async createReportExport(
    tenantId: string,
    userId: string,
    reportCode: string,
    filters: Record<string, unknown>,
  ) {
    const job = await this.prisma.asyncExportJob.create({
      data: {
        tenantId,
        userId,
        entityType: `REPORT:${reportCode}`,
        filters: filters as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + 7 * 864e5),
      },
    });
    // Process inline for now (async worker can pick up PENDING jobs later).
    const result = await this.reports.run(
      tenantId,
      { sub: userId, roles: ['HR'], tenantId, email: '' },
      reportCode,
      filters as any,
    );
    await this.prisma.asyncExportJob.update({
      where: { id: job.id },
      data: { status: 'READY', filters: result as any },
    });
    return { jobId: job.id, status: 'READY', data: result, expiresAt: job.expiresAt };
  }

  listJobs(tenantId: string, userId: string) {
    return this.prisma.asyncExportJob.findMany({
      where: { tenantId, userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  getJob(tenantId: string, userId: string, id: string) {
    return this.prisma.asyncExportJob.findFirst({ where: { id, tenantId, userId } });
  }
}
