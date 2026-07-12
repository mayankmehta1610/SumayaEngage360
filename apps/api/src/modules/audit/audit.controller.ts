import { Controller, Get, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { parseMultiQuery } from '../../common/http/parse-multi-query';
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
    @Query('entityType') entityType?: string | string[],
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
    @Query('filter') filter?: string,
  ) {
    const types = parseMultiQuery(entityType);
    return this.audit.list(tenantId, {
      entityTypes: types.length ? types : undefined,
      entityType: types.length === 1 ? types[0] : undefined,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      page: page !== undefined && page !== '' ? parseInt(page, 10) : undefined,
      pageSize: pageSize !== undefined && pageSize !== '' ? parseInt(pageSize, 10) : undefined,
      sortBy,
      sortDir,
      filter,
    });
  }
}
