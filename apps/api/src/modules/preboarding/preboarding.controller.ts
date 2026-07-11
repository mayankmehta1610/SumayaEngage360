import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsDateString, IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { PreboardingService } from './preboarding.service';

@Controller('preboarding')
export class PreboardingController {
  constructor(
    private readonly preboarding: PreboardingService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('personal-data/mine')
  async myData(@TenantId() t: string, @CurrentUser() u: JwtPayload) {
    const e = await this.prisma.employee.findFirst({ where: { tenantId: t, userId: u.sub } });
    return e ? this.preboarding.getPersonalData(t, e.id) : null;
  }

  @Post('personal-data/mine')
  async saveMyData(@TenantId() t: string, @CurrentUser() u: JwtPayload, @Body() dto: Record<string, unknown>) {
    const e = await this.prisma.employee.findFirstOrThrow({ where: { tenantId: t, userId: u.sub } });
    return this.preboarding.upsertPersonalData(t, e.id, dto);
  }

  @Get('personal-data/:employeeId')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  getData(@TenantId() t: string, @Param('employeeId') id: string) {
    return this.preboarding.getPersonalData(t, id);
  }

  @Get('tasks')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  tasks(@TenantId() t: string) {
    return this.preboarding.tasks(t);
  }

  @Get('tasks/:employeeId')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  employeeTasks(@TenantId() t: string, @Param('employeeId') id: string) {
    return this.preboarding.tasks(t, id);
  }

  @Post('tasks')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  createTask(@TenantId() t: string, @Body() dto: { employeeId: string; taskType: string; title: string; assigneeId?: string; dueDate?: string }) {
    return this.preboarding.createTask(t, dto);
  }

  @Post('tasks/init/:employeeId')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  initTasks(@TenantId() t: string, @Param('employeeId') id: string) {
    return this.preboarding.initDefaultTasks(t, id);
  }

  @Patch('tasks/:id/complete')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  complete(@TenantId() t: string, @Param('id') id: string) {
    return this.preboarding.completeTask(t, id);
  }
}
