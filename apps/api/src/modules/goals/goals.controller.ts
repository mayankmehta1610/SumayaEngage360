import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsDateString, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { GoalsService } from './goals.service';

@Controller('goals')
@Roles(Role.TENANT_ADMIN, Role.HR, Role.MANAGER, Role.EMPLOYEE)
export class GoalsController {
  constructor(
    private readonly goals: GoalsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('library')
  library(@TenantId() t: string) {
    return this.goals.goalLibrary(t);
  }

  @Post('library')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  addTemplate(@TenantId() t: string, @Body() dto: { title: string; category?: string }) {
    return this.goals.createGoalTemplate(t, dto);
  }

  @Get('kpis')
  kpis(@TenantId() t: string) {
    return this.goals.kpis(t);
  }

  @Post('kpis')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  createKpi(@TenantId() t: string, @Body() dto: { code: string; name: string; unit?: string }) {
    return this.goals.createKpi(t, dto);
  }

  @Get('competencies')
  competencies(@TenantId() t: string) {
    return this.goals.competencies(t);
  }

  @Post('competencies')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  createComp(@TenantId() t: string, @Body() dto: { code: string; name: string; level?: number }) {
    return this.goals.createCompetency(t, dto);
  }

  @Get()
  @Roles(Role.TENANT_ADMIN, Role.HR, Role.MANAGER)
  list(@TenantId() t: string, @CurrentUser() u: JwtPayload) {
    if (u.roles.includes(Role.MANAGER) && !this.isHr(u)) {
      return this.goals.managerGoals(t, u.sub);
    }
    return this.goals.employeeGoals(t);
  }

  @Get('mine')
  async mine(@TenantId() t: string, @CurrentUser() u: JwtPayload) {
    const e = await this.prisma.employee.findFirst({ where: { tenantId: t, userId: u.sub } });
    return e ? this.goals.employeeGoals(t, e.id) : [];
  }

  @Post()
  @Roles(Role.TENANT_ADMIN, Role.HR, Role.MANAGER)
  async assign(
    @TenantId() t: string,
    @CurrentUser() u: JwtPayload,
    @Body() dto: { employeeId: string; title: string; target?: string; dueDate?: string },
  ) {
    if (u.roles.includes(Role.MANAGER) && !this.isHr(u)) {
      await this.goals.assertManagerCanAssign(t, u.sub, dto.employeeId);
    }
    return this.goals.assignGoal(t, dto);
  }

  @Patch(':id/progress')
  updateProgress(
    @TenantId() t: string,
    @Param('id') id: string,
    @Body('progress') progress: number,
    @CurrentUser() u: JwtPayload,
  ) {
    return this.goals.updateProgress(t, id, progress, u.sub, this.isHr(u));
  }

  private isHr(user: JwtPayload) {
    return user.roles.includes(Role.TENANT_ADMIN) || user.roles.includes(Role.HR);
  }
}
