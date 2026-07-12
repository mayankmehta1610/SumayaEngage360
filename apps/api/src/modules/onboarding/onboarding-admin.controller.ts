import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { DocumentRequirementDto, VerifyDocumentDto } from './onboarding.dto';
import { OnboardingService } from './onboarding.service';

@Controller('onboarding')
@Roles(Role.TENANT_ADMIN, Role.HR)
export class OnboardingAdminController {
  constructor(private readonly onboarding: OnboardingService) {}

  // Country-specific identity-document checklist (IN: AADHAAR, PAN, …)
  @Post('requirements')
  setRequirement(
    @TenantId() tenantId: string,
    @Body() dto: DocumentRequirementDto,
  ) {
    return this.onboarding.setRequirement(tenantId, dto);
  }

  @Get('requirements')
  listRequirements(
    @TenantId() tenantId: string,
    @Query('country') country?: string,
  ) {
    return this.onboarding.listRequirements(tenantId, country);
  }

  @Get('cases')
  async listCases(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
    @Query('filter') filter?: string,
  ) {
    return this.onboarding.listCases(
      tenantId,
      page !== undefined && page !== '' ? parseInt(page, 10) : undefined,
      pageSize !== undefined && pageSize !== '' ? parseInt(pageSize, 10) : undefined,
      sortBy,
      sortDir,
      filter,
    );
  }

  @Post('documents/:id/verify')
  verifyDocument(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: VerifyDocumentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.onboarding.verifyDocument(tenantId, id, dto, user.sub);
  }

  @Post('cases/:id/approve')
  approveCase(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.onboarding.approveCase(tenantId, id);
  }
}
