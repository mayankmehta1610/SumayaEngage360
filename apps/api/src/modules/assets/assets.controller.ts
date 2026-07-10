import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsOptional, IsString } from 'class-validator';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { AssetsService } from './assets.service';

class CreateAssetDto {
  @IsString()
  assetTag: string;

  @IsString()
  category: string; // LAPTOP, ACCESS_CARD…

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  serialNo?: string;
}

class ReturnAssetDto {
  @IsOptional()
  @IsString()
  condition?: string;
}

@Controller('assets')
@Roles(Role.TENANT_ADMIN, Role.HR)
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateAssetDto) {
    return this.assets.create(tenantId, dto);
  }

  @Get()
  list(@TenantId() tenantId: string) {
    return this.assets.list(tenantId);
  }

  @Post(':id/assign/:employeeId')
  assign(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('employeeId') employeeId: string,
  ) {
    return this.assets.assign(tenantId, id, employeeId);
  }

  @Post('assignments/:assignmentId/return')
  returnAsset(
    @TenantId() tenantId: string,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: ReturnAssetDto,
  ) {
    return this.assets.returnAsset(tenantId, assignmentId, dto.condition);
  }

  @Get('employees/:employeeId')
  employeeAssets(
    @TenantId() tenantId: string,
    @Param('employeeId') employeeId: string,
  ) {
    return this.assets.employeeAssets(tenantId, employeeId);
  }
}
