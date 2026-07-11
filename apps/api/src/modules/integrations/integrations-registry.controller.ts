import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { IntegrationsRegistryService } from './integrations-registry.service';

class UpsertIntegrationDto {
  @IsString()
  integrationId: string;

  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

@Controller('integrations')
@Roles(Role.TENANT_ADMIN, Role.HR)
export class IntegrationsRegistryController {
  constructor(private readonly registry: IntegrationsRegistryService) {}

  @Get()
  definitions() {
    return this.registry.listDefinitions();
  }

  @Get('connections')
  connections(@TenantId() tenantId: string) {
    return this.registry.listTenantConnections(tenantId);
  }

  @Post('connections')
  upsert(@TenantId() tenantId: string, @Body() dto: UpsertIntegrationDto) {
    return this.registry.upsertConnection(tenantId, dto.integrationId, dto.enabled, dto.config);
  }

  @Post('connections/:integrationId/test')
  test(@TenantId() tenantId: string, @Param('integrationId') integrationId: string) {
    return this.registry.testConnection(tenantId, integrationId);
  }

  @Post('connections/:integrationId/invoke')
  invoke(
    @TenantId() tenantId: string,
    @Param('integrationId') integrationId: string,
    @Body() dto: { action: string; payload?: Record<string, unknown> },
  ) {
    return this.registry.invoke(tenantId, integrationId, dto.action, dto.payload ?? {});
  }
}
