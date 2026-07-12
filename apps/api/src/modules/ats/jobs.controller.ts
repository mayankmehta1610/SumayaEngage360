import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { JobStatus, Role } from '@prisma/client';
import { parseMultiQuery } from '../../common/http/parse-multi-query';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { CreateJobDto, UpdateJobDto } from './ats.dto';
import { JobsService } from './jobs.service';

@Controller('jobs')
@Roles(Role.TENANT_ADMIN, Role.HR)
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateJobDto) {
    return this.jobs.create(tenantId, dto);
  }

  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('status') status?: string | string[],
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
    @Query('filter') filter?: string,
  ) {
    const statuses = parseMultiQuery(status) as JobStatus[];
    return this.jobs.findAll(
      tenantId,
      statuses.length ? statuses : undefined,
      page !== undefined && page !== '' ? parseInt(page, 10) : undefined,
      pageSize !== undefined && pageSize !== '' ? parseInt(pageSize, 10) : undefined,
      sortBy,
      sortDir,
      filter,
    );
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.jobs.findOne(tenantId, id);
  }

  @Patch(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateJobDto,
  ) {
    return this.jobs.update(tenantId, id, dto);
  }

  @Post(':id/publish')
  publish(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.jobs.publish(tenantId, id);
  }

  @Get(':id/team')
  team(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.jobs.listTeam(tenantId, id);
  }

  @Post(':id/team')
  addTeam(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { userId: string; role: string },
  ) {
    return this.jobs.addTeamMember(tenantId, id, body.userId, body.role);
  }

  @Patch(':id/vacancy')
  vacancy(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { vacancies?: number; vacanciesFilled?: number; headcountBudget?: number },
  ) {
    return this.jobs.updateVacancy(tenantId, id, body);
  }
}
