import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import {
  IsDateString, IsOptional, IsString,
} from 'class-validator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { AttendanceService } from './attendance.service';

class RegularizationDto {
  @IsDateString()
  workDate: string;

  @IsOptional()
  @IsDateString()
  requestedIn?: string;

  @IsOptional()
  @IsDateString()
  requestedOut?: string;

  @IsString()
  reason: string;
}

class ActionDto {
  @IsOptional()
  @IsString()
  note?: string;
}

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Post('check-in')
  checkIn(@TenantId() tenantId: string, @CurrentUser() u: JwtPayload) {
    return this.attendance.checkIn(tenantId, u.sub);
  }

  @Post('check-out')
  checkOut(@TenantId() tenantId: string, @CurrentUser() u: JwtPayload) {
    return this.attendance.checkOut(tenantId, u.sub);
  }

  @Get('mine')
  mine(@TenantId() tenantId: string, @CurrentUser() u: JwtPayload) {
    return this.attendance.myPunches(tenantId, u.sub);
  }

  @Get('register')
  @Roles(Role.TENANT_ADMIN, Role.HR, Role.MANAGER)
  register(@TenantId() tenantId: string, @Query('date') date?: string) {
    return this.attendance.register(tenantId, date);
  }

  @Post('regularizations')
  requestRegularization(
    @TenantId() tenantId: string,
    @CurrentUser() u: JwtPayload,
    @Body() dto: RegularizationDto,
  ) {
    return this.attendance.requestRegularization(tenantId, u.sub, dto);
  }

  @Get('regularizations/mine')
  myRegularizations(@TenantId() tenantId: string, @CurrentUser() u: JwtPayload) {
    return this.attendance.myRegularizations(tenantId, u.sub);
  }

  @Get('regularizations/pending')
  pendingRegularizations(@TenantId() tenantId: string, @CurrentUser() u: JwtPayload) {
    return this.attendance.pendingRegularizations(tenantId, u.sub);
  }

  @Post('regularizations/:id/approve')
  approveReg(
    @TenantId() tenantId: string, @CurrentUser() u: JwtPayload,
    @Param('id') id: string, @Body() dto: ActionDto,
  ) {
    return this.attendance.actOnRegularization(tenantId, u.sub, u.roles, id, true, dto.note);
  }

  @Post('regularizations/:id/reject')
  rejectReg(
    @TenantId() tenantId: string, @CurrentUser() u: JwtPayload,
    @Param('id') id: string, @Body() dto: ActionDto,
  ) {
    return this.attendance.actOnRegularization(tenantId, u.sub, u.roles, id, false, dto.note);
  }

  @Get('roster')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  roster(@TenantId() tenantId: string, @Query('date') date?: string) {
    return this.attendance.listRoster(tenantId, date);
  }

  @Post('roster')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  createRoster(@TenantId() tenantId: string, @Body() dto: { employeeId: string; shiftId: string; date: string; location?: string }) {
    return this.attendance.createRoster(tenantId, dto);
  }

  @Get('geofences')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  geofences(@TenantId() tenantId: string) {
    return this.attendance.geofences(tenantId);
  }

  @Post('geofences')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  createGeofence(@TenantId() tenantId: string, @Body() dto: { name: string; latitude: number; longitude: number; radiusM?: number }) {
    return this.attendance.createGeofence(tenantId, dto);
  }

  @Post('biometric')
  biometric(@TenantId() tenantId: string, @Body() dto: { employeeCode: string; type: string; deviceId?: string }) {
    return this.attendance.biometricPunch(tenantId, dto);
  }
}
