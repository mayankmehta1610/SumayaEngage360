import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ComplianceCaseStatus, ComplianceCaseType, Role } from '@prisma/client';
import {
  IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min,
} from 'class-validator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { ComplianceService } from './compliance.service';

class ReportCaseDto {
  @IsEnum(ComplianceCaseType)
  type: ComplianceCaseType;

  @IsString()
  title: string;

  @IsString()
  details: string;

  @IsOptional()
  @IsBoolean()
  anonymous?: boolean;

  @IsOptional()
  @IsString()
  subjectEmployeeId?: string;
}

class UpdateCaseDto {
  @IsOptional()
  @IsEnum(ComplianceCaseStatus)
  status?: ComplianceCaseStatus;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsString()
  resolution?: string;

  @IsOptional()
  @IsBoolean()
  legalHold?: boolean;
}

class RetentionDto {
  @IsString()
  entity: string;

  @IsInt()
  @Min(1)
  retainMonths: number;

  @IsOptional()
  @IsBoolean()
  purgeEnabled?: boolean;
}

@Controller('compliance')
export class ComplianceController {
  constructor(private readonly compliance: ComplianceService) {}

  // Any employee can raise a case (optionally anonymous).
  @Post('cases')
  report(@TenantId() tenantId: string, @CurrentUser() u: JwtPayload, @Body() dto: ReportCaseDto) {
    return this.compliance.report(tenantId, u.sub, dto);
  }

  @Get('cases/mine')
  mine(@TenantId() tenantId: string, @CurrentUser() u: JwtPayload) {
    return this.compliance.myCases(tenantId, u.sub);
  }

  @Get('cases')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  list(@TenantId() tenantId: string, @Query('status') status?: ComplianceCaseStatus) {
    return this.compliance.list(tenantId, status);
  }

  @Patch('cases/:id')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateCaseDto) {
    return this.compliance.update(tenantId, id, dto);
  }

  @Post('retention')
  @Roles(Role.TENANT_ADMIN)
  setRetention(@TenantId() tenantId: string, @Body() dto: RetentionDto) {
    return this.compliance.setRetention(tenantId, dto);
  }

  @Get('retention')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  listRetention(@TenantId() tenantId: string) {
    return this.compliance.listRetention(tenantId);
  }

  @Get('retention/purge-preview')
  @Roles(Role.TENANT_ADMIN)
  purgePreview(@TenantId() tenantId: string) {
    return this.compliance.purgePreview(tenantId);
  }
}
