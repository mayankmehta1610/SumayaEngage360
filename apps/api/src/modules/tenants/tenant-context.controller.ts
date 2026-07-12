import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { OnboardingWizardDto, PatchOnboardingDto } from './tenants.dto';
import { TenantsService } from './tenants.service';

/** Tenant-scoped routes for admins completing onboarding / reading tenant profile. */
@Controller('tenant')
@Roles(Role.TENANT_ADMIN, Role.HR)
export class TenantContextController {
  constructor(private readonly tenants: TenantsService) {}

  @Get('me')
  me(@TenantId() tenantId: string) {
    return this.tenants.findOne(tenantId);
  }

  @Post('onboarding-wizard')
  @Roles(Role.TENANT_ADMIN)
  completeWizard(@TenantId() tenantId: string, @Body() dto: OnboardingWizardDto) {
    return this.tenants.completeOnboardingWizard(tenantId, dto);
  }

  @Patch('onboarding')
  @Roles(Role.TENANT_ADMIN)
  patchOnboarding(@TenantId() tenantId: string, @Body() dto: PatchOnboardingDto) {
    return this.tenants.patchOnboarding(tenantId, dto);
  }
}
