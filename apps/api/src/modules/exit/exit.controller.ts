import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import {
  AcceptResignationDto,
  ClearanceActionDto,
  DelegateClearanceDto,
  FnfDto,
  SubmitResignationDto,
} from './exit.dto';
import { ExitService } from './exit.service';

@Controller('exit')
export class ExitController {
  constructor(private readonly exit: ExitService) {}

  // Employee side
  @Post('resignations')
  submit(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SubmitResignationDto,
  ) {
    return this.exit.submit(tenantId, user.sub, dto);
  }

  @Post('resignations/withdraw')
  withdraw(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload) {
    return this.exit.withdraw(tenantId, user.sub);
  }

  @Get('resignations/mine')
  mine(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload) {
    return this.exit.mine(tenantId, user.sub);
  }

  // HR side
  @Get('resignations')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  list(@TenantId() tenantId: string) {
    return this.exit.list(tenantId);
  }

  @Post('resignations/:id/accept')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  accept(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: AcceptResignationDto,
  ) {
    return this.exit.accept(tenantId, id, dto);
  }

  @Post('resignations/:id/clearances/init')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  initClearances(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.exit.initClearances(tenantId, id);
  }

  // Department heads / delegates
  @Get('clearances/mine')
  myClearances(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload) {
    return this.exit.myClearances(tenantId, user.sub);
  }

  @Post('clearances/:id/sign-off')
  signOff(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ClearanceActionDto,
  ) {
    return this.exit.signOffClearance(tenantId, user.sub, id, true, dto);
  }

  @Post('clearances/:id/reject')
  reject(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ClearanceActionDto,
  ) {
    return this.exit.signOffClearance(tenantId, user.sub, id, false, dto);
  }

  @Post('clearances/:id/delegate')
  delegate(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: DelegateClearanceDto,
  ) {
    return this.exit.delegateClearance(tenantId, user.sub, id, dto);
  }

  // Full & final + release
  @Post('resignations/:id/fnf')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  fnf(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: FnfDto,
  ) {
    return this.exit.recordFnf(tenantId, id, dto);
  }

  @Post('resignations/:id/release')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  release(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Query('releaseLetterFileId') releaseLetterFileId?: string,
    @Query('fnfLetterFileId') fnfLetterFileId?: string,
  ) {
    return this.exit.release(tenantId, id, releaseLetterFileId, fnfLetterFileId);
  }
}
