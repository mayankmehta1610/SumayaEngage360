import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApplicationStatus, JobStatus, Prisma } from '@prisma/client';
import { contains, paginatedResponse, parseFilterJson, parseSortDir } from '../../common/http/list-sort-filter';
import { PrismaService } from '../../prisma/prisma.service';
import { ResumeParserService } from '../integrations/resume-parser.service';
import { MatchingService } from '../matching/matching.service';
import { ApplyDto, UpdateApplicationStatusDto } from './ats.dto';

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resumeParser: ResumeParserService,
    private readonly matching: MatchingService,
  ) {}

  // Public apply flow: creates/updates the candidate profile, tags skills
  // (mandatory at application time), records experience, links the resume.
  async apply(tenantId: string, jobId: string, dto: ApplyDto) {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, tenantId, status: JobStatus.PUBLISHED },
    });
    if (!job) throw new NotFoundException('Job not open for applications');
    if (!dto.resumeFileId) {
      throw new BadRequestException('Resume upload is required');
    }

    const demographics = {
      city: dto.city,
      country: dto.country,
      linkedIn: dto.linkedIn,
      yearsExperience: dto.yearsExperience,
      ...(dto.dateOfBirth ? { dateOfBirth: dto.dateOfBirth } : {}),
    };

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
          demographics: demographics as any,
          resumeFileId: dto.resumeFileId,
        },
        update: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          demographics: demographics as any,
          resumeFileId: dto.resumeFileId,
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
          create: {
            candidateId: candidate.id,
            skillId: skill.id,
            yearsOfExp: dto.yearsExperience,
          },
          update: { yearsOfExp: dto.yearsExperience },
        });
      }

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

      const app = await tx.application.create({
        data: {
          tenantId,
          jobId,
          candidateId: candidate.id,
          source: 'CAREERS_PAGE',
        },
        include: { job: { select: { title: true } } },
      });

      await tx.applicationProfile.create({
        data: {
          tenantId,
          applicationId: app.id,
          professionalSummary: dto.professionalSummary,
          domainExpertise: dto.domainExpertise,
          education: dto.education as any,
          coverLetterFileId: dto.coverLetterFileId,
          contacts: dto.contacts as any,
          customFields: dto.customFields as any,
        },
      });

      return app;
    });

    // ONLINE pipeline: parse the resume immediately in the background and
    // refresh match scores against every open job. (The OFFLINE pipeline —
    // ParserCronService — sweeps anything this misses on a schedule.)
    const candidateEmail = dto.email.toLowerCase();
    if (dto.resumeFileId && this.resumeParser.enabled) {
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
    this.matching
      .matchCandidateToOpenJobs(tenantId, application.candidateId)
      .catch(() => undefined);

    return application;
  }

  async findAll(
    tenantId: string,
    jobIds?: string[],
    statuses?: ApplicationStatus[],
    interviewerId?: string,
    page?: number,
    pageSize?: number,
    sortBy?: string,
    sortDir?: string,
    filter?: string,
    search?: string,
  ) {
    const filters = parseFilterJson(filter);
    const where: Prisma.ApplicationWhereInput = {
      tenantId,
      ...(jobIds?.length ? { jobId: { in: jobIds } } : {}),
      ...(statuses?.length === 1 ? { status: statuses[0] } : {}),
      ...(statuses && statuses.length > 1 ? { status: { in: statuses } } : {}),
      ...(interviewerId
        ? { interviews: { some: { interviewerId } } }
        : {}),
    };
    if (filters.candidate) {
      where.OR = [
        { candidate: { firstName: contains(filters.candidate) } },
        { candidate: { lastName: contains(filters.candidate) } },
      ];
    }
    if (filters.email) where.candidate = { email: contains(filters.email) };
    if (filters.job) where.job = { title: contains(filters.job) };
    if (filters.status) where.status = filters.status.toUpperCase() as ApplicationStatus;
    const q = (filters.__search ?? search)?.trim();
    if (q) {
      const or: Prisma.ApplicationWhereInput[] = [
        { candidate: { firstName: contains(q) } },
        { candidate: { lastName: contains(q) } },
        { candidate: { email: contains(q) } },
        { job: { title: contains(q) } },
      ];
      if (Object.values(ApplicationStatus).includes(q.toUpperCase() as ApplicationStatus)) {
        or.push({ status: q.toUpperCase() as ApplicationStatus });
      }
      where.OR = or;
    }
    const dir = parseSortDir(sortDir);
    const orderBy: Prisma.ApplicationOrderByWithRelationInput = (() => {
      switch (sortBy) {
        case 'candidate': return { candidate: { lastName: dir } };
        case 'email': return { candidate: { email: dir } };
        case 'job': return { job: { title: dir } };
        case 'status': return { status: dir };
        case 'applied': return { createdAt: dir };
        default: return { createdAt: dir };
      }
    })();
    const paginated = page !== undefined || pageSize !== undefined;
    const include = paginated
      ? {
          candidate: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          job: { select: { id: true, title: true } },
        }
      : {
          candidate: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          job: { select: { id: true, title: true } },
          interviews: { orderBy: { level: 'asc' as const } },
          offer: true,
        };

    if (!paginated) {
      return this.prisma.application.findMany({ where, include, orderBy });
    }

    const p = Math.max(1, page ?? 1);
    const ps = Math.min(200, Math.max(1, pageSize ?? 50));
    const [data, total] = await Promise.all([
      this.prisma.application.findMany({
        where,
        include,
        orderBy,
        skip: (p - 1) * ps,
        take: ps,
      }),
      this.prisma.application.count({ where }),
    ]);
    return paginatedResponse(data, total, p, ps, sortBy, dir);
  }

  async findOne(tenantId: string, id: string, interviewerId?: string) {
    const app = await this.prisma.application.findFirst({
      where: {
        id,
        tenantId,
        ...(interviewerId
          ? { interviews: { some: { interviewerId } } }
          : {}),
      },
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
        profile: true,
      },
    });
    if (!app) throw new NotFoundException('Application not found');
    return app;
  }

  async getProfile(tenantId: string, applicationId: string, interviewerId?: string) {
    const app = await this.findOne(tenantId, applicationId, interviewerId);
    if (app.profile) return app.profile;
    return this.prisma.applicationProfile.create({
      data: { tenantId, applicationId: app.id },
    });
  }

  async upsertProfile(
    tenantId: string,
    applicationId: string,
    data: {
      professionalSummary?: string;
      domainExpertise?: string[];
      education?: unknown;
      coverLetterFileId?: string;
      contacts?: unknown;
      customFields?: unknown;
    },
    interviewerId?: string,
  ) {
    await this.findOne(tenantId, applicationId, interviewerId);
    return this.prisma.applicationProfile.upsert({
      where: { applicationId },
      create: {
        tenantId,
        applicationId,
        professionalSummary: data.professionalSummary,
        domainExpertise: data.domainExpertise ?? [],
        education: data.education as any,
        coverLetterFileId: data.coverLetterFileId,
        contacts: data.contacts as any,
        customFields: data.customFields as any,
      },
      update: {
        ...(data.professionalSummary !== undefined
          ? { professionalSummary: data.professionalSummary }
          : {}),
        ...(data.domainExpertise !== undefined
          ? { domainExpertise: data.domainExpertise }
          : {}),
        ...(data.education !== undefined ? { education: data.education as any } : {}),
        ...(data.coverLetterFileId !== undefined
          ? { coverLetterFileId: data.coverLetterFileId }
          : {}),
        ...(data.contacts !== undefined ? { contacts: data.contacts as any } : {}),
        ...(data.customFields !== undefined
          ? { customFields: data.customFields as any }
          : {}),
      },
    });
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
