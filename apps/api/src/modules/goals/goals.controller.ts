import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { GoalsService } from './goals.service';

class GoalTemplateDto {
  @IsString() title: string;
  @IsOptional() @IsString() category?: string;
}

class KpiDto {
  @IsString() code: string;
  @IsString() name: string;
  @IsOptional() @IsString() unit?: string;
}

class CompetencyDto {
  @IsString() code: string;
  @IsString() name: string;
  @IsOptional() @IsInt() level?: number;
}

class AssignGoalDto {
  @IsString() employeeId: string;
  @IsString() title: string;
  @IsOptional() @IsString() target?: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsString() cycleId?: string;
}

class ProgressDto {
  @IsNumber() @Min(0) @Max(100) progress: number;
}

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
  addTemplate(@TenantId() t: string, @Body() dto: GoalTemplateDto) {
    return this.goals.createGoalTemplate(t, dto);
  }

  @Get('kpis')
  kpis(@TenantId() t: string) {
    return this.goals.kpis(t);
  }

  @Post('kpis')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  createKpi(@TenantId() t: string, @Body() dto: KpiDto) {
    return this.goals.createKpi(t, dto);
  }

  @Get('competencies')
  competencies(@TenantId() t: string) {
    return this.goals.competencies(t);
  }

  @Post('competencies')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  createComp(@TenantId() t: string, @Body() dto: CompetencyDto) {
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
    @Body() dto: AssignGoalDto,
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
    @Body() dto: ProgressDto,
    @CurrentUser() u: JwtPayload,
  ) {
    return this.goals.updateProgress(t, id, dto.progress, u.sub, this.isHr(u));
  }

  private isHr(user: JwtPayload) {
    return user.roles.includes(Role.TENANT_ADMIN) || user.roles.includes(Role.HR);
  }
}
