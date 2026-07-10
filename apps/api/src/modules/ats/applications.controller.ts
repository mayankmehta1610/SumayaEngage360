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
  ) {
    return this.applications.findAll(tenantId, jobId, status);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.applications.findOne(tenantId, id);
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
}
