import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { AllocateDto, CreateProjectDto, UpdateProjectDto } from './projects.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
@Roles(Role.TENANT_ADMIN, Role.HR, Role.MANAGER)
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Post()
  @Roles(Role.TENANT_ADMIN, Role.HR)
  create(@TenantId() tenantId: string, @Body() dto: CreateProjectDto) {
    return this.projects.create(tenantId, dto);
  }

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.projects.findAll(tenantId);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.projects.findOne(tenantId, id);
  }

  @Patch(':id')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projects.update(tenantId, id, dto);
  }

  @Post(':id/allocations')
  allocate(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: AllocateDto,
  ) {
    return this.projects.allocate(tenantId, id, dto);
  }

  @Post('allocations/:allocationId/end')
  endAllocation(
    @TenantId() tenantId: string,
    @Param('allocationId') allocationId: string,
  ) {
    return this.projects.endAllocation(tenantId, allocationId);
  }

  @Get('employees/:employeeId/allocations')
  employeeAllocations(
    @TenantId() tenantId: string,
    @Param('employeeId') employeeId: string,
  ) {
    return this.projects.employeeAllocations(tenantId, employeeId);
  }
}
