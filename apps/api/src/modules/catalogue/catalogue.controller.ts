import { Controller, Get, Param, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../../common/auth/roles.decorator';
import { CatalogueService } from './catalogue.service';

@Controller('v1')
@Roles(Role.TENANT_ADMIN, Role.HR)
export class CatalogueController {
  constructor(private readonly catalogue: CatalogueService) {}

  @Get('data-entities')
  entities(
    @Query('domain') domain?: string,
    @Query('implemented') implemented?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const opts = {
      domain,
      implemented: implemented === undefined ? undefined : implemented === 'true',
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 50,
    };
    return this.catalogue.listEntitiesPaginated(opts);
  }

  @Get('data-entities/:id')
  entity(@Param('id') id: string) {
    return this.catalogue.getEntity(id);
  }

  @Get('api-catalogue')
  apis(
    @Query('domain') domain?: string,
    @Query('implemented') implemented?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.catalogue.listApisPaginated({
      domain,
      implemented: implemented === undefined ? undefined : implemented === 'true',
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 50,
    });
  }

  @Get('api-catalogue/:id')
  api(@Param('id') id: string) {
    return this.catalogue.getApi(id);
  }
}
