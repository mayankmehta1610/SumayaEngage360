import { Injectable, NotFoundException } from '@nestjs/common';
import { JobStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ResumeExtractorService } from '../matching/resume-extractor.service';

// Public, unauthenticated careers pages — tenant resolved from subdomain/header,
// hiring client from the URL slug: /public/careers/{clientSlug}
@Injectable()
export class CareersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly extractor: ResumeExtractorService,
  ) {}

  /**
   * Parse an uploaded resume into structured form fields. The tenant's own
   * skill master enriches the built-in skill dictionary, and any recognised
   * city is matched to the geo master (returning a cityId) so the applicant's
   * location can be pre-selected in the structured picker.
   */
  async parseResume(tenantId: string, resumeFileId: string) {
    const file = await this.prisma.fileObject.findFirst({
      where: { id: resumeFileId, OR: [{ tenantId }, { tenantId: null }] },
    });
    if (!file) throw new NotFoundException('Resume file not found');

    const tenantSkills = (
      await this.prisma.skill.findMany({
        where: { OR: [{ tenantId }, { tenantId: null }] },
        select: { name: true },
        take: 500,
      })
    ).map((s) => s.name);

    const parsed = await this.extractor.extract(resumeFileId, tenantSkills);
    if (!parsed) return { parsed: false };

    // Resolve a recognised city name against the geo master (best effort).
    let geo: { cityId: string; stateId: string; countryCode: string; label: string } | null = null;
    if (parsed.city) {
      const city = await this.prisma.geoCity.findFirst({
        where: { name: { equals: parsed.city, mode: 'insensitive' } },
        include: { state: { select: { id: true, countryCode: true, name: true } } },
      });
      if (city) {
        geo = {
          cityId: city.id,
          stateId: city.state.id,
          countryCode: city.state.countryCode,
          label: `${city.name}, ${city.state.name}`,
        };
      }
    }

    return { parsed: true, fields: parsed, geo };
  }

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
        countryCode: true,
        stateId: true,
        cityId: true,
        workMode: true,
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
        countryCode: true,
        stateId: true,
        cityId: true,
        workMode: true,
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
