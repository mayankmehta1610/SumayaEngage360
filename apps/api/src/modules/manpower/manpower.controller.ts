import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsArray, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { ManpowerService } from './manpower.service';

class CreateDto {
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
  @IsInt() @Min(1) @Max(10000) headcount: number;
  @IsOptional() @IsString() departmentId?: string;
  @IsOptional() @IsNumber() @Min(0) budget?: number;
  @IsOptional() @IsString() justification?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() employmentType?: string;
  @IsOptional() @IsNumber() @Min(0) minExperience?: number;
  @IsOptional() @IsNumber() @Min(0) maxExperience?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) skills?: string[];
}

@Controller('manpower')
@Roles(Role.TENANT_ADMIN, Role.HR, Role.MANAGER)
export class ManpowerController {
  constructor(private readonly manpower: ManpowerService) {}

  @Get()
  list(@TenantId() t: string) {
    return this.manpower.list(t);
  }

  @Post()
  create(@TenantId() t: string, @CurrentUser() u: JwtPayload, @Body() dto: CreateDto) {
    return this.manpower.create(t, u.sub, dto);
  }

  @Patch(':id/submit')
  submit(@TenantId() t: string, @Param('id') id: string) {
    return this.manpower.submit(t, id);
  }

  @Patch(':id/approve')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  approve(@TenantId() t: string, @Param('id') id: string, @CurrentUser() u: JwtPayload) {
    return this.manpower.approve(t, id, u.sub);
  }

  @Patch(':id/reject')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  reject(@TenantId() t: string, @Param('id') id: string) {
    return this.manpower.reject(t, id);
  }
}
