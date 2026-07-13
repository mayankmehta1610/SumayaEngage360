import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { BenefitsService } from './benefits.service';

class PlanDto {
  @IsString() code: string;
  @IsString() name: string;
  @IsString() category: string;
  @IsOptional() @IsString() description?: string;
}

class EnrollDto {
  @IsString() employeeId: string;
}

class UpdatePlanDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() description?: string;
}

@Controller('benefits')
export class BenefitsController {
  constructor(
    private readonly benefits: BenefitsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('plans')
  @Roles(Role.TENANT_ADMIN, Role.HR, Role.EMPLOYEE, Role.MANAGER)
  plans(@TenantId() t: string) {
    return this.benefits.plans(t);
  }

  @Post('plans')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  createPlan(@TenantId() t: string, @Body() dto: PlanDto) {
    return this.benefits.createPlan(t, dto);
  }

  @Patch('plans/:id')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  updatePlan(@TenantId() t: string, @Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.benefits.updatePlan(t, id, dto);
  }

  @Delete('plans/:id')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  deactivatePlan(@TenantId() t: string, @Param('id') id: string) {
    return this.benefits.deactivatePlan(t, id);
  }

  @Get('enrollments')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  enrollments(@TenantId() t: string) {
    return this.benefits.enrollments(t);
  }

  @Post('plans/:id/enroll')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  enroll(@TenantId() t: string, @Param('id') id: string, @Body() dto: EnrollDto) {
    return this.benefits.enroll(t, id, dto.employeeId);
  }

  @Delete('enrollments/:id')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  endEnrollment(@TenantId() t: string, @Param('id') id: string) {
    return this.benefits.endEnrollment(t, id);
  }

  @Get('enrollments/mine')
  myEnrollments(@TenantId() t: string, @CurrentUser() u: JwtPayload) {
    return this.prisma.employee.findFirst({ where: { tenantId: t, userId: u.sub } }).then((e) =>
      e ? this.benefits.myEnrollments(t, e.id) : [],
    );
  }
}
