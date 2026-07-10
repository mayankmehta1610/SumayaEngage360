import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { BgcReportDto, CreateBgcVendorDto, SubmitBgcDto } from './onboarding.dto';
import { BgcService } from './bgc.service';

@Controller('bgc')
export class BgcController {
  constructor(private readonly bgc: BgcService) {}

  @Post('vendors')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  createVendor(@TenantId() tenantId: string, @Body() dto: CreateBgcVendorDto) {
    return this.bgc.createVendor(tenantId, dto);
  }

  @Get('vendors')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  listVendors(@TenantId() tenantId: string) {
    return this.bgc.listVendors(tenantId);
  }

  @Post('employees/:employeeId/submit')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  submit(
    @TenantId() tenantId: string,
    @Param('employeeId') employeeId: string,
    @Body() dto: SubmitBgcDto,
  ) {
    return this.bgc.submit(tenantId, employeeId, dto);
  }

  @Get('checks')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  listChecks(@TenantId() tenantId: string) {
    return this.bgc.listChecks(tenantId);
  }

  // Vendor portal — restricted to the BGC_VENDOR role.
  @Get('vendor/cases')
  @Roles(Role.BGC_VENDOR)
  vendorCases(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload) {
    return this.bgc.vendorCases(tenantId, user.email);
  }

  @Post('vendor/cases/:id/report')
  @Roles(Role.BGC_VENDOR)
  submitReport(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: BgcReportDto,
  ) {
    return this.bgc.submitReport(tenantId, id, user.email, dto);
  }
}
