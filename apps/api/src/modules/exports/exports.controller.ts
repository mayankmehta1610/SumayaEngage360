import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsObject, IsString } from 'class-validator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { ExportsService } from './exports.service';

class ExportDto {
  @IsString() reportCode: string;
  @IsObject() filters: Record<string, unknown>;
}

@Controller('exports')
@Roles(Role.TENANT_ADMIN, Role.HR, Role.MANAGER)
export class ExportsController {
  constructor(private readonly exports: ExportsService) {}

  @Post('reports')
  create(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ExportDto,
  ) {
    return this.exports.createReportExport(tenantId, user.sub, dto.reportCode, dto.filters);
  }

  @Get('jobs')
  list(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload) {
    return this.exports.listJobs(tenantId, user.sub);
  }

  @Get('jobs/:id')
  get(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.exports.getJob(tenantId, user.sub, id);
  }
}
