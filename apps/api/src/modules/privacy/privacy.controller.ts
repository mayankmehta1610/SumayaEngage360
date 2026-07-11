import { Body, Controller, Get, Param, Post, Patch } from '@nestjs/common';
import { DsrStatus, DsrType, Role } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { PrivacyService } from './privacy.service';

class ConsentDto {
  @IsString() purpose: string;
  @IsBoolean() granted: boolean;
  @IsOptional() @IsString() version?: string;
}

class DsrDto {
  @IsEnum(DsrType) type: DsrType;
  @IsOptional() @IsString() details?: string;
}

class DsrActionDto {
  @IsEnum(DsrStatus) status: DsrStatus;
}

@Controller('privacy')
export class PrivacyController {
  constructor(private readonly privacy: PrivacyService) {}

  @Post('consent')
  consent(@TenantId() t: string, @CurrentUser() u: JwtPayload, @Body() dto: ConsentDto) {
    return this.privacy.recordConsent(t, u.sub, dto.purpose, dto.granted, dto.version);
  }

  @Get('consent/mine')
  myConsents(@TenantId() t: string, @CurrentUser() u: JwtPayload) {
    return this.privacy.myConsents(t, u.sub);
  }

  @Post('dsr')
  submitDsr(@TenantId() t: string, @CurrentUser() u: JwtPayload, @Body() dto: DsrDto) {
    return this.privacy.submitDsr(t, u.sub, dto.type, dto.details);
  }

  @Get('dsr/mine')
  myDsrs(@TenantId() t: string, @CurrentUser() u: JwtPayload) {
    return this.privacy.myDsrs(t, u.sub);
  }

  @Get('dsr')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  listDsrs(@TenantId() t: string) {
    return this.privacy.listDsrs(t);
  }

  @Patch('dsr/:id')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  act(@TenantId() t: string, @Param('id') id: string, @Body() dto: DsrActionDto) {
    return this.privacy.actOnDsr(t, id, dto.status);
  }
}
