import { Injectable, NotFoundException } from '@nestjs/common';
import { JobStatus, Prisma } from '@prisma/client';
import { contains, parseFilterJson, parseSortDir } from '../../common/http/list-sort-filter';
import { PrismaService } from '../../prisma/prisma.service';
import { MatchingService } from '../matching/matching.service';
import { CreateJobDto, UpdateJobDto } from './ats.dto';

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matching: MatchingService,
  ) {}

  async create(tenantId: string, dto: CreateJobDto) {
    const { skills = [], interviewPlan, ...data } = dto;
    return this.prisma.job.create({
      data: {
        tenantId,
        ...data,
        interviewPlan: interviewPlan as any,
        skills: {
          create: await Promise.all(
            skills.map(async (name) => ({
              skill: {
                connectOrCreate: {
                  where: { tenantId_name: { tenantId, name } },
                  create: { tenantId, name },
                },
              },
            })),
          ),
        },
      },
      include: { skills: { include: { skill: true } } },
    });
  }

  async findAll(
    tenantId: string,
    statuses?: JobStatus[],
    page?: number,
    pageSize?: number,
    sortBy?: string,
    sortDir?: string,
    filter?: string,
  ) {
    const filters = parseFilterJson(filter);
    const where: Prisma.JobWhereInput = {
      tenantId,
      ...(statuses?.length === 1 ? { status: statuses[0] } : {}),
      ...(statuses && statuses.length > 1 ? { status: { in: statuses } } : {}),
    };
    if (filters.title) where.title = contains(filters.title);
    if (filters.client) where.hiringClient = { name: contains(filters.client) };
    if (filters.location) where.location = contains(filters.location);
    if (filters.status) where.status = filters.status.toUpperCase() as JobStatus;
    if (filters.__search) {
      const q = filters.__search;
      where.OR = [
        { title: contains(q) },
        { location: contains(q) },
        { hiringClient: { name: contains(q) } },
      ];
    }
    const include = {
      hiringClient: { select: { id: true, name: true, slug: true } },
      skills: { include: { skill: true } },
      _count: { select: { applications: true } },
    };
    const dir = parseSortDir(sortDir);
    const orderBy: Prisma.JobOrderByWithRelationInput = (() => {
      switch (sortBy) {
        case 'title': return { title: dir };
        case 'client': return { hiringClient: { name: dir } };
        case 'location': return { location: dir };
        case 'vacancies': return { vacancies: dir };
        case 'applications': return { applications: { _count: dir } };
        case 'status': return { status: dir };
        default: return { createdAt: dir };
      }
    })();
    const paginated = page !== undefined || pageSize !== undefined;
    if (!paginated) {
      return this.prisma.job.findMany({ where, include, orderBy: { title: 'asc' } });
    }
    const p = Math.max(1, page ?? 1);
    const ps = Math.min(200, Math.max(1, pageSize ?? 50));
    const [data, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        include,
        orderBy,
        skip: (p - 1) * ps,
        take: ps,
      }),
      this.prisma.job.count({ where }),
    ]);
    return {
      data,
      meta: { total, page: p, pageSize: ps, totalPages: Math.ceil(total / ps) || 1 },
    };
  }

  async findOne(tenantId: string, id: string) {
    const job = await this.prisma.job.findFirst({
      where: { id, tenantId },
      include: {
        hiringClient: true,
        skills: { include: { skill: true } },
        _count: { select: { applications: true } },
      },
    });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async update(tenantId: string, id: string, dto: UpdateJobDto) {
    await this.findOne(tenantId, id);
    return this.prisma.job.update({ where: { id }, data: dto });
  }

  async publish(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    const job = await this.prisma.job.update({
      where: { id },
      data: { status: JobStatus.PUBLISHED },
    });
    // New JD published: score the existing talent pool against it in the
    // background so recruiters immediately see matching past candidates.
    this.matching
      .matchJob(tenantId, id, { useAi: false, autoShortlist: false })
      .catch(() => undefined);
    return job;
  }

  listTeam(tenantId: string, jobId: string) {
    return this.prisma.jobTeamMember.findMany({ where: { tenantId, jobId } });
  }

  async addTeamMember(tenantId: string, jobId: string, userId: string, role: string) {
    await this.findOne(tenantId, jobId);
    const member = await this.prisma.jobTeamMember.create({
      data: { tenantId, jobId, userId, role },
    });
    const field = role === 'RECRUITER' ? 'recruiterIds' : 'hiringTeamIds';
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    const ids = new Set([...(job?.[field as 'recruiterIds'] ?? []), userId]);
    await this.prisma.job.update({
      where: { id: jobId },
      data: { [field]: [...ids] },
    });
    return member;
  }

  async updateVacancy(tenantId: string, jobId: string, body: { vacancies?: number; vacanciesFilled?: number; headcountBudget?: number }) {
    await this.findOne(tenantId, jobId);
    return this.prisma.job.update({ where: { id: jobId }, data: body });
  }
}
