import { Controller, Get, Param } from '@nestjs/common';
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
  list(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload) {
    return this.prisma.candidate.findMany({
      where: {
        tenantId,
        ...(this.interviewerScope(user)
          ? { applications: { some: { interviews: { some: { interviewerId: user.sub } } } } }
          : {}),
      },
      include: {
        skills: { include: { skill: { select: { name: true } } } },
        _count: { select: { applications: true, matches: true } },
      },
      orderBy: { createdAt: 'desc' },
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
