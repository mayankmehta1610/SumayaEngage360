import { Body, Controller, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../../common/auth/jwt-auth.guard';
import { Public } from '../../common/auth/public.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { ConfigureJurisdictionsDto, CreateWorkAuthorizationDto, UpdateWorkAuthorizationDto, UpsertEmployerProfileDto, UpsertJurisdictionProfileDto } from './jurisdictions.dto';
import { JurisdictionsService } from './jurisdictions.service';

@Controller('jurisdictions')
export class JurisdictionsController {
  constructor(private readonly jurisdictions: JurisdictionsService) {}

  @Public() @Get('catalog') catalog() { return this.jurisdictions.catalog(); }

  @Get('tenant') @Roles(Role.TENANT_ADMIN, Role.HR, Role.MANAGER)
  tenant(@TenantId() tenantId: string) { return this.jurisdictions.tenantConfiguration(tenantId); }

  @Put('tenant') @Roles(Role.TENANT_ADMIN)
  configure(@TenantId() tenantId: string, @Body() dto: ConfigureJurisdictionsDto) { return this.jurisdictions.configureTenant(tenantId, dto); }

  @Get('employer-profiles') @Roles(Role.TENANT_ADMIN, Role.HR, Role.MANAGER)
  employerProfiles(@TenantId() tenantId: string, @Query('jurisdictionCode') jurisdictionCode?: string) { return this.jurisdictions.listEmployerProfiles(tenantId, jurisdictionCode); }

  @Put('employer-profiles') @Roles(Role.TENANT_ADMIN, Role.HR)
  employerProfile(@TenantId() tenantId: string, @CurrentUser() actor: JwtPayload, @Body() dto: UpsertEmployerProfileDto) { return this.jurisdictions.upsertEmployerProfile(tenantId, actor.sub, dto); }

  @Get('candidates/:candidateId') @Roles(Role.TENANT_ADMIN, Role.HR)
  candidate(@TenantId() tenantId: string, @Param('candidateId') candidateId: string) { return this.jurisdictions.candidateOverview(tenantId, candidateId); }

  @Put('candidates/:candidateId/profile') @Roles(Role.TENANT_ADMIN, Role.HR)
  profile(@TenantId() tenantId: string, @Param('candidateId') candidateId: string, @Body() dto: UpsertJurisdictionProfileDto) { return this.jurisdictions.upsertProfile(tenantId, candidateId, dto); }

  @Get('work-authorizations') @Roles(Role.TENANT_ADMIN, Role.HR, Role.MANAGER)
  cases(@TenantId() tenantId: string, @Query('jurisdictionCode') jurisdictionCode?: string, @Query('status') status?: string) { return this.jurisdictions.listCases(tenantId, jurisdictionCode, status); }

  @Post('work-authorizations') @Roles(Role.TENANT_ADMIN, Role.HR)
  create(@TenantId() tenantId: string, @Body() dto: CreateWorkAuthorizationDto) { return this.jurisdictions.createCase(tenantId, dto); }

  @Patch('work-authorizations/:id') @Roles(Role.TENANT_ADMIN, Role.HR)
  update(@TenantId() tenantId: string, @Param('id') id: string, @CurrentUser() actor: JwtPayload, @Body() dto: UpdateWorkAuthorizationDto) { return this.jurisdictions.updateCase(tenantId, id, actor.sub, dto); }

  @Get('expiry-dashboard') @Roles(Role.TENANT_ADMIN, Role.HR, Role.MANAGER)
  expiry(@TenantId() tenantId: string, @Query('days') days?: string) { return this.jurisdictions.expiryDashboard(tenantId, Number(days ?? 90)); }
}
