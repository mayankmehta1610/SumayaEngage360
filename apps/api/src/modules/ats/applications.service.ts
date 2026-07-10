import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApplicationStatus, JobStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ResumeParserService } from '../integrations/resume-parser.service';
import { ApplyDto, UpdateApplicationStatusDto } from './ats.dto';

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resumeParser: ResumeParserService,
  ) {}

  // Public apply flow: creates/updates the candidate profile, tags skills
  // (mandatory at application time), records experience, links the resume.
  async apply(tenantId: string, jobId: string, dto: ApplyDto) {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, tenantId, status: JobStatus.PUBLISHED },
    });
    if (!job) throw new NotFoundException('Job not open for applications');

    const application = await this.prisma.$transaction(async (tx) => {
      const email = dto.email.toLowerCase();
      const candidate = await tx.candidate.upsert({
        where: { tenantId_email: { tenantId, email } },
        create: {
          tenantId,
          email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          demographics: dto.demographics as any,
          resumeFileId: dto.resumeFileId,
        },
        update: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          demographics: dto.demographics as any,
          ...(dto.resumeFileId ? { resumeFileId: dto.resumeFileId } : {}),
        },
      });

      const dup = await tx.application.findUnique({
        where: { jobId_candidateId: { jobId, candidateId: candidate.id } },
      });
      if (dup) throw new ConflictException('You have already applied to this role');

      for (const name of dto.skills) {
        const skill = await tx.skill.upsert({
          where: { tenantId_name: { tenantId, name } },
          create: { tenantId, name },
          update: {},
        });
        await tx.candidateSkill.upsert({
          where: {
            candidateId_skillId: { candidateId: candidate.id, skillId: skill.id },
          },
          create: { candidateId: candidate.id, skillId: skill.id },
          update: {},
        });
      }

      if (dto.experiences?.length) {
        await tx.candidateExperience.deleteMany({
          where: { candidateId: candidate.id },
        });
        await tx.candidateExperience.createMany({
          data: dto.experiences.map((e) => ({
            candidateId: candidate.id,
            company: e.company,
            title: e.title,
            startDate: new Date(e.startDate),
            endDate: e.endDate ? new Date(e.endDate) : null,
            description: e.description,
          })),
        });
      }

      return tx.application.create({
        data: {
          tenantId,
          jobId,
          candidateId: candidate.id,
          source: 'CAREERS_PAGE',
        },
        include: { job: { select: { title: true } } },
      });
    });

    // LLM resume parsing runs in the background — the application is already
    // accepted; the structured profile enriches the candidate when it lands.
    if (dto.resumeFileId && this.resumeParser.enabled) {
      const candidateEmail = dto.email.toLowerCase();
      this.resumeParser
        .parse(dto.resumeFileId)
        .then(async (parsed) => {
          if (!parsed) return;
          await this.prisma.candidate.update({
            where: { tenantId_email: { tenantId, email: candidateEmail } },
            data: { parsedResume: parsed as any },
          });
        })
        .catch(() => undefined);
    }

    return application;
  }

  findAll(tenantId: string, jobId?: string, status?: ApplicationStatus) {
    return this.prisma.application.findMany({
      where: {
        tenantId,
        ...(jobId ? { jobId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        candidate: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        job: { select: { id: true, title: true } },
        interviews: { orderBy: { level: 'asc' } },
        offer: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const app = await this.prisma.application.findFirst({
      where: { id, tenantId },
      include: {
        candidate: {
          include: {
            skills: { include: { skill: true } },
            experiences: true,
          },
        },
        job: true,
        interviews: { orderBy: { level: 'asc' } },
        offer: true,
      },
    });
    if (!app) throw new NotFoundException('Application not found');
    return app;
  }

  async updateStatus(
    tenantId: string,
    id: string,
    dto: UpdateApplicationStatusDto,
  ) {
    await this.findOne(tenantId, id);
    return this.prisma.application.update({
      where: { id },
      data: { status: dto.status },
    });
  }
}
