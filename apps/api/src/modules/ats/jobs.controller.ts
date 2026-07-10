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
  findAll(@TenantId() tenantId: string, @Query('status') status?: JobStatus) {
    return this.jobs.findAll(tenantId, status);
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
}
