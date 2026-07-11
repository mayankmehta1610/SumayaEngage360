import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../../common/auth/roles.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../../common/auth/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { RecordInterviewResultDto, ScheduleInterviewDto } from './ats.dto';
import { InterviewsService } from './interviews.service';

@Controller()
@Roles(Role.TENANT_ADMIN, Role.HR, Role.INTERVIEWER)
export class InterviewsController {
  constructor(
    private readonly interviews: InterviewsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('interviewers')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  interviewers(@TenantId() tenantId: string) {
    return this.prisma.users.findMany({
      where: { tenantId, isActive: true, roles: { has: Role.INTERVIEWER } },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
  }

  @Post('applications/:applicationId/interviews')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  schedule(
    @TenantId() tenantId: string,
    @Param('applicationId') applicationId: string,
    @Body() dto: ScheduleInterviewDto,
  ) {
    return this.interviews.schedule(tenantId, applicationId, dto);
  }

  @Get('applications/:applicationId/interviews')
  list(
    @TenantId() tenantId: string,
    @Param('applicationId') applicationId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.interviews.listForApplication(
      tenantId,
      applicationId,
      this.interviewerScope(user),
    );
  }

  @Patch('interviews/:id/result')
  recordResult(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: RecordInterviewResultDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.interviews.recordResult(
      tenantId,
      id,
      dto,
      this.interviewerScope(user),
    );
  }

  private interviewerScope(user: JwtPayload) {
    if (!user.roles.includes(Role.INTERVIEWER)) return undefined;
    if (user.roles.includes(Role.TENANT_ADMIN) || user.roles.includes(Role.HR)) {
      return undefined;
    }
    return user.sub;
  }
}
