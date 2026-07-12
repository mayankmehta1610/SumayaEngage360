import { Injectable, NotFoundException } from '@nestjs/common';
import { JobStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// Public, unauthenticated careers pages — tenant resolved from subdomain/header,
// hiring client from the URL slug: /public/careers/{clientSlug}
@Injectable()
export class CareersService {
  constructor(private readonly prisma: PrismaService) {}

  async getClientPage(tenantId: string, clientSlug: string) {
    const client = await this.prisma.hiringClient.findFirst({
      where: { tenantId, slug: clientSlug, isActive: true },
      select: { id: true, name: true, description: true, logoUrl: true },
    });
    if (!client) throw new NotFoundException('Careers page not found');

    const jobs = await this.prisma.job.findMany({
      where: { tenantId, hiringClientId: client.id, status: JobStatus.PUBLISHED },
      select: {
        id: true,
        title: true,
        description: true,
        vacancies: true,
        location: true,
        employmentType: true,
        minExperience: true,
        maxExperience: true,
        skills: { select: { skill: { select: { name: true } }, mandatory: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { client, jobs };
  }

  async getFieldDefinitions(tenantId: string, jobId: string) {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, tenantId, status: JobStatus.PUBLISHED },
      select: { id: true },
    });
    if (!job) throw new NotFoundException('Job not found');
    return this.prisma.tenantFieldDefinition.findMany({
      where: { tenantId, entity: 'APPLICATION', isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
      select: {
        id: true,
        fieldKey: true,
        label: true,
        type: true,
        required: true,
        options: true,
        sortOrder: true,
      },
    });
  }

  async getJob(tenantId: string, jobId: string) {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, tenantId, status: JobStatus.PUBLISHED },
      select: {
        id: true,
        title: true,
        description: true,
        vacancies: true,
        location: true,
        employmentType: true,
        minExperience: true,
        maxExperience: true,
        hiringClient: { select: { name: true, slug: true, logoUrl: true } },
        skills: { select: { skill: { select: { name: true } }, mandatory: true } },
      },
    });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }
}
