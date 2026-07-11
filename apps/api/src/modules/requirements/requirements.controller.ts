import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Roles } from '../../common/auth/roles.decorator';
import { RequirementsService } from './requirements.service';

class MarkFeatureDto {
  @IsString() status: string;
  @IsOptional() @IsBoolean() cursorDone?: boolean;
}

@Controller('requirements')
export class RequirementsController {
  constructor(private readonly req: RequirementsService) {}

  @Get('overview')
  @Roles(Role.TENANT_ADMIN, Role.HR, Role.PLATFORM_ADMIN)
  overview() {
    return this.req.overview();
  }

  @Get('features')
  @Roles(Role.TENANT_ADMIN, Role.HR, Role.PLATFORM_ADMIN)
  features(
    @Query('domain') domain?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.req.features({
      domain,
      status,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 50,
    });
  }

  @Get('features/stats')
  @Roles(Role.TENANT_ADMIN, Role.HR, Role.PLATFORM_ADMIN)
  stats() {
    return this.req.featureStats();
  }

  @Get('modules')
  modules() {
    return this.req.modules();
  }

  @Get('roles')
  roles() {
    return this.req.roles();
  }

  @Get('workflows')
  workflows() {
    return this.req.workflows();
  }

  @Patch('features/:id')
  @Roles(Role.PLATFORM_ADMIN, Role.TENANT_ADMIN)
  mark(@Param('id') id: string, @Body() dto: MarkFeatureDto) {
    return this.req.markFeature(id, dto.status, dto.cursorDone ?? true);
  }
}
