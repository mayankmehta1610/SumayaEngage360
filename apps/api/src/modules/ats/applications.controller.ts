import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ApplicationStatus, Role } from '@prisma/client';
import { Roles } from '../../common/auth/roles.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../../common/auth/jwt-auth.guard';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { UpdateApplicationStatusDto } from './ats.dto';
import { ApplicationsService } from './applications.service';

@Controller('applications')
@Roles(Role.TENANT_ADMIN, Role.HR, Role.INTERVIEWER)
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('jobId') jobId?: string,
    @Query('status') status?: ApplicationStatus,
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.applications.findAll(
      tenantId,
      jobId,
      status,
      this.interviewerScope(user),
    );
  }

  @Get(':id')
  findOne(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.applications.findOne(tenantId, id, this.interviewerScope(user));
  }

  @Patch(':id/status')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  updateStatus(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.applications.updateStatus(tenantId, id, dto);
  }

  private interviewerScope(user?: JwtPayload) {
    if (!user?.roles.includes(Role.INTERVIEWER)) return undefined;
    if (user.roles.includes(Role.TENANT_ADMIN) || user.roles.includes(Role.HR)) {
      return undefined;
    }
    return user.sub;
  }
}
