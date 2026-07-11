import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Role, SurveyStatus, SurveyType } from '@prisma/client';
import {
  IsArray, IsBoolean, IsDateString, IsEnum, IsOptional, IsString,
} from 'class-validator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { SurveysService } from './surveys.service';

class CreateSurveyDto {
  @IsString()
  title: string;

  @IsEnum(SurveyType)
  type: SurveyType;

  @IsOptional()
  @IsBoolean()
  anonymous?: boolean;

  @IsArray()
  questions: { q: string; kind: string }[];

  @IsOptional()
  @IsDateString()
  closesAt?: string;
}

class RespondDto {
  @IsArray()
  answers: { q: string; value: unknown }[];
}

@Controller('surveys')
export class SurveysController {
  constructor(private readonly surveys: SurveysService) {}

  @Post()
  @Roles(Role.TENANT_ADMIN, Role.HR)
  create(@TenantId() tenantId: string, @Body() dto: CreateSurveyDto) {
    return this.surveys.create(tenantId, dto);
  }

  @Get()
  @Roles(Role.TENANT_ADMIN, Role.HR)
  list(@TenantId() tenantId: string) {
    return this.surveys.list(tenantId);
  }

  @Post(':id/open')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  open(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.surveys.setStatus(tenantId, id, SurveyStatus.OPEN);
  }

  @Post(':id/close')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  close(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.surveys.setStatus(tenantId, id, SurveyStatus.CLOSED);
  }

  @Get('open/mine')
  openForMe(@TenantId() tenantId: string, @CurrentUser() u: JwtPayload) {
    return this.surveys.openForMe(tenantId, u.sub);
  }

  @Post(':id/respond')
  respond(
    @TenantId() tenantId: string,
    @CurrentUser() u: JwtPayload,
    @Param('id') id: string,
    @Body() dto: RespondDto,
  ) {
    return this.surveys.respond(tenantId, u.sub, id, dto.answers);
  }

  @Get(':id/analytics')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  analytics(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.surveys.analytics(tenantId, id);
  }
}
