import { Controller, Get, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @Roles(Role.TENANT_ADMIN, Role.HR)
  list(
    @TenantId() tenantId: string,
    @Query('entityType') entityType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.audit.list(tenantId, {
      entityType,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      page: page !== undefined && page !== '' ? parseInt(page, 10) : undefined,
      pageSize: pageSize !== undefined && pageSize !== '' ? parseInt(pageSize, 10) : undefined,
    });
  }
}
