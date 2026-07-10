import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import {
  CreateCycleDto,
  FinalizeDto,
  ManagerReviewDto,
  SelfReviewDto,
} from './appraisals.dto';
import { AppraisalsService } from './appraisals.service';

@Controller('appraisals')
export class AppraisalsController {
  constructor(private readonly appraisals: AppraisalsService) {}

  @Post('cycles')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  createCycle(@TenantId() tenantId: string, @Body() dto: CreateCycleDto) {
    return this.appraisals.createCycle(tenantId, dto);
  }

  @Get('cycles')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  listCycles(@TenantId() tenantId: string) {
    return this.appraisals.listCycles(tenantId);
  }

  @Post('cycles/:id/launch')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  launch(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.appraisals.launchCycle(tenantId, id);
  }

  @Get('mine')
  mine(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload) {
    return this.appraisals.mine(tenantId, user.sub);
  }

  @Get('team')
  team(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload) {
    return this.appraisals.myTeam(tenantId, user.sub);
  }

  @Post(':id/self-review')
  self(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SelfReviewDto,
  ) {
    return this.appraisals.submitSelf(tenantId, user.sub, id, dto);
  }

  @Post(':id/manager-review')
  manager(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ManagerReviewDto,
  ) {
    return this.appraisals.submitManager(tenantId, user.sub, id, dto);
  }

  @Post(':id/finalize')
  finalize(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: FinalizeDto,
  ) {
    return this.appraisals.finalize(tenantId, user.sub, id, dto);
  }
}
