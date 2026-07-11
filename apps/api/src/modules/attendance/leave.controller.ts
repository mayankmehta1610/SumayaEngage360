import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import {
  IsBoolean, IsDateString, IsNumber, IsOptional, IsString, Min,
} from 'class-validator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { LeaveService } from './leave.service';

class CreateLeaveTypeDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  annualQuota: number;

  @IsOptional()
  @IsBoolean()
  carryForward?: boolean;
}

class LeaveRequestDto {
  @IsString()
  leaveTypeId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

class ActionDto {
  @IsOptional()
  @IsString()
  note?: string;
}

@Controller('leave')
export class LeaveController {
  constructor(private readonly leave: LeaveService) {}

  @Post('types')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  createType(@TenantId() tenantId: string, @Body() dto: CreateLeaveTypeDto) {
    return this.leave.createType(tenantId, dto);
  }

  @Get('types')
  listTypes(@TenantId() tenantId: string) {
    return this.leave.listTypes(tenantId);
  }

  @Get('balances/mine')
  myBalances(@TenantId() tenantId: string, @CurrentUser() u: JwtPayload) {
    return this.leave.myBalances(tenantId, u.sub);
  }

  @Post('requests')
  request(@TenantId() tenantId: string, @CurrentUser() u: JwtPayload, @Body() dto: LeaveRequestDto) {
    return this.leave.request(tenantId, u.sub, dto);
  }

  @Get('requests/mine')
  mine(@TenantId() tenantId: string, @CurrentUser() u: JwtPayload) {
    return this.leave.mine(tenantId, u.sub);
  }

  @Post('requests/:id/cancel')
  cancel(@TenantId() tenantId: string, @CurrentUser() u: JwtPayload, @Param('id') id: string) {
    return this.leave.cancel(tenantId, u.sub, id);
  }

  @Get('requests/pending')
  pending(@TenantId() tenantId: string, @CurrentUser() u: JwtPayload) {
    return this.leave.pendingForManager(tenantId, u.sub);
  }

  @Post('requests/:id/approve')
  approve(
    @TenantId() tenantId: string, @CurrentUser() u: JwtPayload,
    @Param('id') id: string, @Body() dto: ActionDto,
  ) {
    return this.leave.act(tenantId, u.sub, u.roles, id, true, dto.note);
  }

  @Post('requests/:id/reject')
  reject(
    @TenantId() tenantId: string, @CurrentUser() u: JwtPayload,
    @Param('id') id: string, @Body() dto: ActionDto,
  ) {
    return this.leave.act(tenantId, u.sub, u.roles, id, false, dto.note);
  }

  @Get('calendar')
  calendar(@TenantId() tenantId: string, @Query('month') month?: string) {
    return this.leave.calendar(tenantId, month);
  }
}
