import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { RecordInterviewResultDto, ScheduleInterviewDto } from './ats.dto';
import { InterviewsService } from './interviews.service';

@Controller()
@Roles(Role.TENANT_ADMIN, Role.HR, Role.INTERVIEWER)
export class InterviewsController {
  constructor(private readonly interviews: InterviewsService) {}

  @Post('applications/:applicationId/interviews')
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
  ) {
    return this.interviews.listForApplication(tenantId, applicationId);
  }

  @Patch('interviews/:id/result')
  recordResult(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: RecordInterviewResultDto,
  ) {
    return this.interviews.recordResult(tenantId, id, dto);
  }
}
