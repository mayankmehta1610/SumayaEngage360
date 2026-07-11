import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { MastersService } from './masters.service';

@Controller('masters')
@Roles(Role.TENANT_ADMIN, Role.HR, Role.MANAGER)
export class MastersController {
  constructor(private readonly svc: MastersService) {}

  @Get('job-families') listJobFamilies(@TenantId() tenantId: string) {
    return this.svc.listJobFamilies(tenantId);
  }
  @Post('job-families') createJobFamily(@TenantId() tenantId: string, @Body() body: { code: string; name: string }) {
    return this.svc.createJobFamily(tenantId, body);
  }
  @Patch('job-families/:id') updateJobFamily(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: { code?: string; name?: string }) {
    return this.svc.updateJobFamily(tenantId, id, body);
  }

  @Get('positions') listPositions(@TenantId() tenantId: string) {
    return this.svc.listPositions(tenantId);
  }
  @Post('positions') createPosition(@TenantId() tenantId: string, @Body() body: { code: string; title: string; familyId?: string }) {
    return this.svc.createPosition(tenantId, body);
  }
  @Patch('positions/:id') updatePosition(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: { code?: string; title?: string; familyId?: string; isActive?: boolean }) {
    return this.svc.updatePosition(tenantId, id, body);
  }

  @Get('bgv-packages') listBgvPackages(@TenantId() tenantId: string) {
    return this.svc.listBgvPackages(tenantId);
  }
  @Post('bgv-packages') createBgvPackage(@TenantId() tenantId: string, @Body() body: { code: string; name: string; checks: unknown }) {
    return this.svc.createBgvPackage(tenantId, body);
  }
  @Patch('bgv-packages/:id') updateBgvPackage(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: { code?: string; name?: string; checks?: unknown; isActive?: boolean }) {
    return this.svc.updateBgvPackage(tenantId, id, body);
  }

  @Get('rating-scales') listRatingScales(@TenantId() tenantId: string) {
    return this.svc.listRatingScales(tenantId);
  }
  @Post('rating-scales') createRatingScale(@TenantId() tenantId: string, @Body() body: { name: string; levels: unknown }) {
    return this.svc.createRatingScale(tenantId, body);
  }

  @Get('country-configs') listCountryConfigs(@TenantId() tenantId: string) {
    return this.svc.listCountryConfigs(tenantId);
  }
  @Post('country-configs') createCountryConfig(@TenantId() tenantId: string, @Body() body: { country: string; settings: unknown }) {
    return this.svc.createCountryConfig(tenantId, body);
  }
  @Patch('country-configs/:id') updateCountryConfig(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: { settings: unknown }) {
    return this.svc.updateCountryConfig(tenantId, id, body);
  }

  @Get('documents') listDocuments(@TenantId() tenantId: string) {
    return this.svc.listDocuments(tenantId);
  }
  @Post('documents') createDocument(@TenantId() tenantId: string, @Body() body: { title: string; category: string; fileId?: string; tags?: string[] }) {
    return this.svc.createDocument(tenantId, body);
  }

  @Get('scheduled-jobs') listScheduledJobs(@TenantId() tenantId: string) {
    return this.svc.listScheduledJobs(tenantId);
  }
  @Post('scheduled-jobs') createScheduledJob(@TenantId() tenantId: string, @Body() body: { name: string; cron: string; jobType: string; config?: unknown }) {
    return this.svc.createScheduledJob(tenantId, body);
  }

  @Get('check-ins') listCheckIns(@TenantId() tenantId: string, @Query('employeeId') employeeId?: string) {
    return this.svc.listCheckIns(tenantId, employeeId);
  }
  @Post('check-ins') createCheckIn(@TenantId() tenantId: string, @Body() body: { employeeId: string; managerId?: string; notes: string; mood?: number }) {
    return this.svc.createCheckIn(tenantId, body);
  }

  @Get('calibrations') listCalibrations(@TenantId() tenantId: string) {
    return this.svc.listCalibrations(tenantId);
  }
  @Post('calibrations') createCalibration(@TenantId() tenantId: string, @Body() body: { name: string; cycleId?: string }) {
    return this.svc.createCalibration(tenantId, body);
  }
  @Patch('calibrations/:id') updateCalibration(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: { status?: string; ratings?: unknown }) {
    return this.svc.updateCalibration(tenantId, id, body);
  }
}
