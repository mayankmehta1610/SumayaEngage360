import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { EmployeeStatus, Role } from '@prisma/client';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import {
  AddSkillsDto,
  CreateEmployeeDto,
  SalaryStructureDto,
  UpdateEmployeeDto,
} from './employees.dto';
import { EmployeesService } from './employees.service';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Post()
  @Roles(Role.TENANT_ADMIN, Role.HR)
  create(@TenantId() tenantId: string, @Body() dto: CreateEmployeeDto) {
    return this.employees.create(tenantId, dto);
  }

  @Get()
  @Roles(Role.TENANT_ADMIN, Role.HR, Role.MANAGER)
  findAll(
    @TenantId() tenantId: string,
    @Query('status') status?: EmployeeStatus,
  ) {
    return this.employees.findAll(tenantId, status);
  }

  // Company directory — any signed-in user (needed to pick colleagues for
  // recognition/feedback). Exposes names and roles only.
  @Get('directory')
  async directory(@TenantId() tenantId: string) {
    return this.employees.directory(tenantId);
  }

  // Employee's own profile (BGC never included).
  @Get('me')
  async me(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload) {
    const emp = await this.employees.byUserId(user.sub);
    return this.employees.findOne(tenantId, emp.id);
  }

  @Get('me/salary')
  async mySalary(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload) {
    const emp = await this.employees.byUserId(user.sub);
    return this.employees.salaryHistory(tenantId, emp.id);
  }

  @Get(':id')
  @Roles(Role.TENANT_ADMIN, Role.HR, Role.MANAGER)
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.employees.findOne(tenantId, id);
  }

  @Patch(':id')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employees.update(tenantId, id, dto);
  }

  @Post(':id/skills')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  addSkills(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: AddSkillsDto,
  ) {
    return this.employees.addSkills(tenantId, id, dto);
  }

  @Post(':id/salary-structures')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  addSalary(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: SalaryStructureDto,
  ) {
    return this.employees.addSalaryStructure(tenantId, id, dto);
  }

  @Get(':id/salary-structures')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  salaryHistory(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.employees.salaryHistory(tenantId, id);
  }
}
