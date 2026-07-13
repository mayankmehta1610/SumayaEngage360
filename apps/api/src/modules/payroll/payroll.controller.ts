import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { PayrollService } from './payroll.service';

class ComponentDto {
  @IsString() code: string;
  @IsString() name: string;
  @IsString() type: string;
  @IsOptional() @IsBoolean() isStatutory?: boolean;
}

class CalendarDto {
  @IsString() name: string;
  @IsOptional() @IsString() frequency?: string;
  @IsOptional() @IsInt() @Min(1) @Max(31) payDay?: number;
}

class RunDto {
  @IsString() calendarId: string;
  @IsDateString() periodStart: string;
  @IsDateString() periodEnd: string;
}

@Controller('payroll')
export class PayrollController {
  constructor(
    private readonly payroll: PayrollService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('components')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  async components(@TenantId() t: string) {
    await this.payroll.ensureDefaultComponents(t);
    return this.payroll.components(t);
  }

  @Post('components')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  createComponent(@TenantId() t: string, @Body() dto: ComponentDto) {
    return this.payroll.createComponent(t, dto);
  }

  @Get('calendars')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  calendars(@TenantId() t: string) {
    return this.payroll.calendars(t);
  }

  @Post('calendars')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  createCalendar(@TenantId() t: string, @Body() dto: CalendarDto) {
    return this.payroll.createCalendar(t, dto);
  }

  @Get('runs')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  runs(@TenantId() t: string) {
    return this.payroll.runs(t);
  }

  @Post('runs')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  createRun(@TenantId() t: string, @Body() dto: RunDto) {
    return this.payroll.createRun(t, dto);
  }

  @Post('runs/:id/process')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  process(@TenantId() t: string, @Param('id') id: string) {
    return this.payroll.processRun(t, id);
  }

  @Get('runs/:id/payslips')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  payslips(@TenantId() t: string, @Param('id') id: string) {
    return this.payroll.payslipsForRun(t, id);
  }

  @Get('payslips/mine')
  myPayslips(@TenantId() t: string, @CurrentUser() u: JwtPayload) {
    return this.prisma.employee.findFirst({ where: { tenantId: t, userId: u.sub } }).then((e) =>
      e ? this.payroll.myPayslips(t, e.id) : [],
    );
  }
}
