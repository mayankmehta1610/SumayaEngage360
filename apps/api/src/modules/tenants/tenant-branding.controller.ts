import { Body, Controller, Get, NotFoundException, Patch, Res } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Response } from 'express';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { FilesService } from '../files/files.service';
import { UpdateBrandingDto } from './tenants.dto';
import { TenantsService } from './tenants.service';

/**
 * Tenant branding (self-service CMS): logo + brand colors, managed by the
 * tenant admin, readable by every signed-in user so the shell can theme itself.
 */
@Controller('tenant')
export class TenantBrandingController {
  constructor(
    private readonly tenants: TenantsService,
    private readonly files: FilesService,
  ) {}

  @Get('branding')
  branding(@TenantId() tenantId: string) {
    return this.tenants.branding(tenantId);
  }

  @Patch('branding')
  @Roles(Role.TENANT_ADMIN)
  updateBranding(@TenantId() tenantId: string, @Body() dto: UpdateBrandingDto) {
    return this.tenants.updateBranding(tenantId, dto);
  }

  @Get('logo')
  async logo(@TenantId() tenantId: string, @Res() res: Response) {
    const b = await this.tenants.branding(tenantId);
    if (!b.logoFileId) throw new NotFoundException('No uploaded logo');
    const { stream, meta } = await this.files.getStream(b.logoFileId, tenantId);
    res.setHeader('Content-Type', meta.contentType);
    res.setHeader('Content-Disposition', 'inline');
    stream.pipe(res);
  }
}
