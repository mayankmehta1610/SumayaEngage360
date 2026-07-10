import { Body, Controller, Param, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Public } from '../../common/auth/public.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { CreateOfferDto } from './ats.dto';
import { OffersService } from './offers.service';

@Controller()
export class OffersController {
  constructor(private readonly offers: OffersService) {}

  @Post('applications/:applicationId/offer')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  create(
    @TenantId() tenantId: string,
    @Param('applicationId') applicationId: string,
    @Body() dto: CreateOfferDto,
  ) {
    return this.offers.create(tenantId, applicationId, dto);
  }

  @Post('offers/:id/send')
  @Roles(Role.TENANT_ADMIN, Role.HR)
  send(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.offers.send(tenantId, id);
  }

  // Candidate-facing: accept/decline from the offer email link.
  @Public()
  @Post('public/offers/:id/accept')
  accept(@Param('id') id: string) {
    return this.offers.respond(id, true);
  }

  @Public()
  @Post('public/offers/:id/decline')
  decline(@Param('id') id: string) {
    return this.offers.respond(id, false);
  }
}
