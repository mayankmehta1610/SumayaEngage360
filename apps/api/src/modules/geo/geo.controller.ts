import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
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

// Geographic master data. Lookups are public (used by the pre-auth careers
// pages); adding cities requires a tenant admin/HR.
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
    @Query('stateId') stateId?: string,
    @Query('country') country?: string,
    @Query('q') q?: string,
  ) {
    return this.geo.cities({ stateId, countryCode: country, q });
  }

  @Post('cities')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  addCity(@TenantId() tenantId: string, @Body() dto: AddCityDto) {
    return this.geo.addCity(tenantId, dto.stateId, dto.name);
  }
}
