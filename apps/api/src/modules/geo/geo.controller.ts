import { Body, Controller, Delete, Get, Param, Post, Query, Req } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { IsString, MaxLength } from 'class-validator';
import { Public } from '../../common/auth/public.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { GeoService } from './geo.service';

class AddCityDto {
  @IsString()
  stateId: string;

  @IsString()
  @MaxLength(100)
  name: string;
}

class ProvisionCityDto {
  @IsString()
  cityId: string;
}

// Geographic master data. Lookups are public (used by the pre-auth careers
// pages); when a tenant context is present, city lookups scope to the
// tenant's provisioned operating cities. Country is never a free dropdown
// in-tenant — it comes from the tenant provisioning / URI.
@Controller('geo')
export class GeoController {
  constructor(private readonly geo: GeoService) {}

  @Public()
  @Get('countries')
  countries() {
    return this.geo.countries();
  }

  @Public()
  @Get('states')
  states(@Query('country') country: string) {
    return this.geo.states(country ?? '');
  }

  @Public()
  @Get('cities')
  cities(
    @Req() req: Request,
    @Query('stateId') stateId?: string,
    @Query('country') country?: string,
    @Query('q') q?: string,
    @Query('all') all?: string,
  ) {
    // `all=true` bypasses tenant scoping (used by the provisioning UI itself).
    const tenantId = all === 'true' ? null : ((req as any).tenantId as string | undefined);
    return this.geo.cities({ stateId, countryCode: country, q, tenantId });
  }

  @Post('cities')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  addCity(@TenantId() tenantId: string, @Body() dto: AddCityDto) {
    return this.geo.addCity(tenantId, dto.stateId, dto.name);
  }

  // ── tenant operating cities ─────────────────────────────────────

  @Get('tenant-cities')
  tenantCities(@TenantId() tenantId: string) {
    return this.geo.tenantCities(tenantId);
  }

  @Post('tenant-cities')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  provision(@TenantId() tenantId: string, @Body() dto: ProvisionCityDto) {
    return this.geo.provisionCity(tenantId, dto.cityId);
  }

  @Delete('tenant-cities/:cityId')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  remove(@TenantId() tenantId: string, @Param('cityId') cityId: string) {
    return this.geo.removeTenantCity(tenantId, cityId);
  }
}
