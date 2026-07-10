import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { CreatePolicyDto } from './onboarding.dto';
import { PoliciesService } from './policies.service';

@Controller('policies')
export class PoliciesController {
  constructor(private readonly policies: PoliciesService) {}

  @Post()
  @Roles(Role.TENANT_ADMIN, Role.HR)
  create(@TenantId() tenantId: string, @Body() dto: CreatePolicyDto) {
    return this.policies.create(tenantId, dto);
  }

  @Get()
  list(@TenantId() tenantId: string) {
    return this.policies.list(tenantId);
  }

  @Get(':id/acknowledgements')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  acknowledgements(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.policies.acknowledgements(tenantId, id);
  }

  @Post(':id/acknowledge')
  acknowledge(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.policies.acknowledgeAsEmployee(tenantId, user.sub, id);
  }
}
