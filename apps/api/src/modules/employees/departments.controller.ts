import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto, CreateDesignationDto } from './employees.dto';

@Controller()
@Roles(Role.TENANT_ADMIN, Role.HR, Role.MANAGER)
export class DepartmentsController {
  constructor(private readonly departments: DepartmentsService) {}

  @Post('departments')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  createDepartment(
    @TenantId() tenantId: string,
    @Body() dto: CreateDepartmentDto,
  ) {
    return this.departments.createDepartment(tenantId, dto);
  }

  @Get('departments')
  listDepartments(@TenantId() tenantId: string) {
    return this.departments.listDepartments(tenantId);
  }

  @Post('departments/:id/head/:employeeId')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  setHead(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('employeeId') employeeId: string,
  ) {
    return this.departments.setHead(tenantId, id, employeeId);
  }

  @Post('designations')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  createDesignation(
    @TenantId() tenantId: string,
    @Body() dto: CreateDesignationDto,
  ) {
    return this.departments.createDesignation(tenantId, dto);
  }

  @Get('designations')
  listDesignations(@TenantId() tenantId: string) {
    return this.departments.listDesignations(tenantId);
  }
}
