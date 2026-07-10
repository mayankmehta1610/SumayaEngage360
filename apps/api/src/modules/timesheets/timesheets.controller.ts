import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../../common/auth/jwt-auth.guard';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { CreateTimesheetDto, TimesheetActionDto } from './timesheets.dto';
import { TimesheetsService } from './timesheets.service';

@Controller('timesheets')
export class TimesheetsController {
  constructor(private readonly timesheets: TimesheetsService) {}

  @Post()
  create(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTimesheetDto,
  ) {
    return this.timesheets.create(tenantId, user.sub, dto);
  }

  @Get('mine')
  mine(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload) {
    return this.timesheets.mine(tenantId, user.sub);
  }

  @Post(':id/submit')
  submit(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.timesheets.submit(tenantId, user.sub, id);
  }

  @Get('pending-approval')
  pending(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload) {
    return this.timesheets.pendingForManager(tenantId, user.sub);
  }

  @Post(':id/approve')
  approve(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: TimesheetActionDto,
  ) {
    return this.timesheets.actOn(tenantId, user.sub, user.roles, id, true, dto);
  }

  @Post(':id/discard')
  discard(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: TimesheetActionDto,
  ) {
    return this.timesheets.actOn(tenantId, user.sub, user.roles, id, false, dto);
  }
}
