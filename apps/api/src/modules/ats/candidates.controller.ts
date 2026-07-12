import { Body, Controller, Get, NotFoundException, Param, Patch, Query } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { IsOptional, IsString } from 'class-validator';
import { contains, paginatedResponse, parseFilterJson, parseSortDir } from '../../common/http/list-sort-filter';
import { parseMultiQuery } from '../../common/http/parse-multi-query';
import { Roles } from '../../common/auth/roles.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../../common/auth/jwt-auth.guard';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { PrismaService } from '../../prisma/prisma.service';

class PatchCandidateDto {
  @IsOptional()
  @IsString()
  resumeFileId?: string;
}

// Talent pool: every candidate ever captured, with parse status and history.
@Controller('candidates')
@Roles(Role.TENANT_ADMIN, Role.HR, Role.INTERVIEWER)
export class CandidatesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
    @Query('filter') filter?: string,
    @Query('jobIds') jobIds?: string | string[],
    @Query('jobId') jobId?: string | string[],
  ) {
    const filters = parseFilterJson(filter);
    const jobs = [...parseMultiQuery(jobIds), ...parseMultiQuery(jobId)];
    const q = filters.__search ?? search?.trim();
    const where: Prisma.CandidateWhereInput = {
      tenantId,
      ...(this.interviewerScope(user)
        ? { applications: { some: { interviews: { some: { interviewerId: user.sub } } } } }
        : {}),
      ...(jobs.length
        ? { applications: { some: { jobId: { in: jobs } } } }
        : {}),
    };
    if (filters.name) {
      where.OR = [
        { firstName: contains(filters.name) },
        { lastName: contains(filters.name) },
      ];
    }
    if (filters.email) where.email = contains(filters.email);
    if (filters.phone) where.phone = contains(filters.phone);
    if (q) {
      where.OR = [
        { firstName: contains(q) },
        { lastName: contains(q) },
        { email: contains(q) },
      ];
    }
    const include = {
      skills: { include: { skill: { select: { name: true } } } },
      _count: { select: { applications: true, matches: true } },
    };
    const dir = parseSortDir(sortDir);
    const orderBy: Prisma.CandidateOrderByWithRelationInput = (() => {
      switch (sortBy) {
        case 'name': return { lastName: dir };
        case 'email': return { email: dir };
        case 'phone': return { phone: dir };
        case 'applications': return { applications: { _count: dir } };
        default: return { createdAt: dir };
      }
    })();
    const paginated = page !== undefined || pageSize !== undefined;
    if (!paginated) {
      return this.prisma.candidate.findMany({ where, include, orderBy });
    }
    const p = Math.max(1, page ? parseInt(page, 10) : 1);
    const ps = Math.min(200, Math.max(1, pageSize ? parseInt(pageSize, 10) : 50));
    const [data, total] = await Promise.all([
      this.prisma.candidate.findMany({
        where,
        include,
        orderBy,
        skip: (p - 1) * ps,
        take: ps,
      }),
      this.prisma.candidate.count({ where }),
    ]);
    return paginatedResponse(data, total, p, ps, sortBy, dir);
  }

  @Patch(':id')
  async patch(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: PatchCandidateDto,
  ) {
    const existing = await this.prisma.candidate.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Candidate not found');
    return this.prisma.candidate.update({
      where: { id },
      data: {
        ...(dto.resumeFileId !== undefined ? { resumeFileId: dto.resumeFileId } : {}),
      },
    });
  }

  @Get(':id')
  detail(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.prisma.candidate.findFirst({
      where: {
        id,
        tenantId,
        ...(this.interviewerScope(user)
          ? { applications: { some: { interviews: { some: { interviewerId: user.sub } } } } }
          : {}),
      },
      include: {
        skills: { include: { skill: true } },
        experiences: true,
        applications: { include: { job: { select: { title: true } } } },
        matches: {
          include: { job: { select: { title: true } } },
          orderBy: { finalScore: 'desc' },
        },
      },
    });
  }

  private interviewerScope(user: JwtPayload) {
    return user.roles.includes(Role.INTERVIEWER) &&
      !user.roles.includes(Role.TENANT_ADMIN) &&
      !user.roles.includes(Role.HR);
  }
}
