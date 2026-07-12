import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsArray, IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { MastersService } from './masters.service';

class JobFamilyDto {
  @IsString() code: string;
  @IsString() name: string;
}
class JobFamilyUpdateDto {
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() name?: string;
}
class PositionDto {
  @IsString() code: string;
  @IsString() title: string;
  @IsOptional() @IsString() familyId?: string;
}
class PositionUpdateDto {
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() familyId?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
class BgvPackageDto {
  @IsString() code: string;
  @IsString() name: string;
  @IsArray() checks: unknown[];
}
class BgvPackageUpdateDto {
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsArray() checks?: unknown[];
  @IsOptional() @IsBoolean() isActive?: boolean;
}
class RatingScaleDto {
  @IsString() name: string;
  @IsArray() levels: unknown[];
}
class RatingScaleUpdateDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsArray() levels?: unknown[];
}
class CountryConfigDto {
  @IsString() country: string;
  @IsObject() settings: Record<string, unknown>;
}
class CountryConfigUpdateDto {
  @IsObject() settings: Record<string, unknown>;
}

@Controller('masters')
@Roles(Role.TENANT_ADMIN, Role.HR, Role.MANAGER)
export class MastersController {
  constructor(private readonly svc: MastersService) {}

  @Get('job-families') listJobFamilies(@TenantId() tenantId: string) {
    return this.svc.listJobFamilies(tenantId);
  }
  @Post('job-families') createJobFamily(@TenantId() tenantId: string, @Body() body: JobFamilyDto) {
    return this.svc.createJobFamily(tenantId, body);
  }
  @Patch('job-families/:id') updateJobFamily(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: JobFamilyUpdateDto) {
    return this.svc.updateJobFamily(tenantId, id, body);
  }
  @Delete('job-families/:id') deleteJobFamily(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.svc.deleteJobFamily(tenantId, id);
  }

  @Get('positions') listPositions(@TenantId() tenantId: string) {
    return this.svc.listPositions(tenantId);
  }
  @Post('positions') createPosition(@TenantId() tenantId: string, @Body() body: PositionDto) {
    return this.svc.createPosition(tenantId, body);
  }
  @Patch('positions/:id') updatePosition(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: PositionUpdateDto) {
    return this.svc.updatePosition(tenantId, id, body);
  }
  @Delete('positions/:id') deletePosition(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.svc.deletePosition(tenantId, id);
  }

  @Get('bgv-packages') listBgvPackages(@TenantId() tenantId: string) {
    return this.svc.listBgvPackages(tenantId);
  }
  @Post('bgv-packages') createBgvPackage(@TenantId() tenantId: string, @Body() body: BgvPackageDto) {
    return this.svc.createBgvPackage(tenantId, body);
  }
  @Patch('bgv-packages/:id') updateBgvPackage(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: BgvPackageUpdateDto) {
    return this.svc.updateBgvPackage(tenantId, id, body);
  }
  @Delete('bgv-packages/:id') deleteBgvPackage(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.svc.deleteBgvPackage(tenantId, id);
  }

  @Get('rating-scales') listRatingScales(@TenantId() tenantId: string) {
    return this.svc.listRatingScales(tenantId);
  }
  @Post('rating-scales') createRatingScale(@TenantId() tenantId: string, @Body() body: RatingScaleDto) {
    return this.svc.createRatingScale(tenantId, body);
  }
  @Patch('rating-scales/:id') updateRatingScale(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: RatingScaleUpdateDto) {
    return this.svc.updateRatingScale(tenantId, id, body);
  }
  @Delete('rating-scales/:id') deleteRatingScale(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.svc.deleteRatingScale(tenantId, id);
  }

  @Get('country-configs') listCountryConfigs(@TenantId() tenantId: string) {
    return this.svc.listCountryConfigs(tenantId);
  }
  @Post('country-configs') createCountryConfig(@TenantId() tenantId: string, @Body() body: CountryConfigDto) {
    return this.svc.createCountryConfig(tenantId, body);
  }
  @Patch('country-configs/:id') updateCountryConfig(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: CountryConfigUpdateDto) {
    return this.svc.updateCountryConfig(tenantId, id, body);
  }
  @Delete('country-configs/:id') deleteCountryConfig(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.svc.deleteCountryConfig(tenantId, id);
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
