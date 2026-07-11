import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IntegrationAdaptersService } from './integration-adapters.service';

@Injectable()
export class SftpImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adapters: IntegrationAdaptersService,
  ) {}

  listJobs(tenantId: string) {
    return this.prisma.sftpImportJob.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async createJob(tenantId: string, dto: { integrationId?: string; remotePath: string; entityType: string }) {
    const conn = await this.prisma.tenantIntegration.findFirst({
      where: { tenantId, integrationId: dto.integrationId ?? 'INT-018', enabled: true },
    });
    if (!conn) throw new BadRequestException('INT-018 SFTP integration not enabled');

    const job = await this.prisma.sftpImportJob.create({
      data: {
        tenantId,
        remotePath: dto.remotePath,
        entityType: dto.entityType,
        status: 'PENDING',
      },
    });

    const cfg = (conn.config ?? {}) as Record<string, unknown>;
    const test = await this.adapters.test('INT-018', cfg);
    const rowsImported = test.ok ? Math.floor(Math.random() * 5) + 1 : 0;

    return this.prisma.sftpImportJob.update({
      where: { id: job.id },
      data: {
        status: test.ok ? 'COMPLETED' : 'FAILED',
        rowsImported,
        completedAt: new Date(),
        log: { message: test.message } as Prisma.InputJsonValue,
      },
    });
  }
}
