import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import {
  IsBoolean, IsInt, IsObject, IsOptional, IsString, Min,
} from 'class-validator';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { ConfigService } from './config.service';

class BranchDto {
  @IsString() code: string;
  @IsString() name: string;
  @IsOptional() @IsString() country?: string;
}

class ShiftDto {
  @IsString() code: string;
  @IsString() name: string;
  @IsString() startTime: string;
  @IsString() endTime: string;
  @IsOptional() @IsInt() @Min(0) graceMinutes?: number;
}

class FeatureFlagDto {
  @IsString() code: string;
  @IsString() name: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
}

class ConfigItemDto {
  @IsString() areaId: string;
  @IsString() key: string;
  @IsObject() value: Record<string, unknown>;
}

class PatchFlagDto {
  @IsBoolean() enabled: boolean;
}

@Controller('config')
@Roles(Role.TENANT_ADMIN, Role.HR)
export class ConfigController {
  constructor(private readonly config: ConfigService) {}

  @Get('areas')
  areas() {
    return this.config.listAreas();
  }

  @Get('items')
  items(@TenantId() tenantId: string) {
    return this.config.listItems(tenantId);
  }

  @Post('items')
  setItem(@TenantId() tenantId: string, @Body() dto: ConfigItemDto) {
    return this.config.setItem(tenantId, dto.areaId, dto.key, dto.value);
  }

  @Get('branches')
  branches(@TenantId() tenantId: string) {
    return this.config.listBranches(tenantId);
  }

  @Post('branches')
  createBranch(@TenantId() tenantId: string, @Body() dto: BranchDto) {
    return this.config.createBranch(tenantId, dto);
  }

  @Get('shifts')
  shifts(@TenantId() tenantId: string) {
    return this.config.listShifts(tenantId);
  }

  @Post('shifts')
  createShift(@TenantId() tenantId: string, @Body() dto: ShiftDto) {
    return this.config.createShift(tenantId, dto);
  }

  @Get('feature-flags')
  flags(@TenantId() tenantId: string) {
    return this.config.listFlags(tenantId);
  }

  @Post('feature-flags')
  createFlag(@TenantId() tenantId: string, @Body() dto: FeatureFlagDto) {
    return this.config.createFlag(tenantId, dto);
  }

  @Patch('feature-flags/:id')
  toggleFlag(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: PatchFlagDto,
  ) {
    return this.config.toggleFlag(tenantId, id, dto.enabled);
  }
}
