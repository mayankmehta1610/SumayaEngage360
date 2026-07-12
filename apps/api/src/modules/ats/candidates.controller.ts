import { Controller, Get, Param, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../../common/auth/roles.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../../common/auth/jwt-auth.guard';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { PrismaService } from '../../prisma/prisma.service';

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
  ) {
    const where = {
      tenantId,
      ...(this.interviewerScope(user)
        ? { applications: { some: { interviews: { some: { interviewerId: user.sub } } } } }
        : {}),
      ...(search?.trim()
        ? {
            OR: [
              { firstName: { contains: search.trim(), mode: 'insensitive' as const } },
              { lastName: { contains: search.trim(), mode: 'insensitive' as const } },
              { email: { contains: search.trim(), mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const include = {
      skills: { include: { skill: { select: { name: true } } } },
      _count: { select: { applications: true, matches: true } },
    };
    const orderBy = { createdAt: 'desc' as const };
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
    return {
      data,
      meta: { total, page: p, pageSize: ps, totalPages: Math.ceil(total / ps) || 1 },
    };
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
