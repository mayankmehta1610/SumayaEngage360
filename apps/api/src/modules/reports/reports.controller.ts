import { Controller, Get, Param, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { ReportQueryDto } from './reports.dto';
import { ReportsService } from './reports.service';

@Roles(Role.TENANT_ADMIN, Role.HR, Role.MANAGER)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  catalogue() {
    return this.reports.catalogue();
  }

  @Get(':code')
  run(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('code') code: string,
    @Query() dto: ReportQueryDto,
  ) {
    return this.reports.run(tenantId, user, code.toUpperCase(), dto);
  }
}
