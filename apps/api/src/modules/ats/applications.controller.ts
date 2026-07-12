import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApplicationStatus, Role } from '@prisma/client';
import { parseMultiQuery } from '../../common/http/parse-multi-query';
import { Roles } from '../../common/auth/roles.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../../common/auth/jwt-auth.guard';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { UpdateApplicationStatusDto, UpsertApplicationProfileDto } from './ats.dto';
import { ApplicationsService } from './applications.service';

@Controller('applications')
@Roles(Role.TENANT_ADMIN, Role.HR, Role.INTERVIEWER)
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('jobId') jobId?: string | string[],
    @Query('jobIds') jobIds?: string | string[],
    @Query('status') status?: string | string[],
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
    @Query('filter') filter?: string,
    @Query('search') search?: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    const jobs = [...parseMultiQuery(jobIds), ...parseMultiQuery(jobId)];
    const statuses = parseMultiQuery(status) as ApplicationStatus[];
    return this.applications.findAll(
      tenantId,
      jobs.length ? jobs : undefined,
      statuses.length ? statuses : undefined,
      this.interviewerScope(user),
      page !== undefined && page !== '' ? parseInt(page, 10) : undefined,
      pageSize !== undefined && pageSize !== '' ? parseInt(pageSize, 10) : undefined,
      sortBy,
      sortDir,
      filter,
      search,
    );
  }

  @Get(':id/profile')
  getProfile(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.applications.getProfile(tenantId, id, this.interviewerScope(user));
  }

  @Post(':id/profile')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  upsertProfile(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpsertApplicationProfileDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.applications.upsertProfile(
      tenantId,
      id,
      dto,
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
