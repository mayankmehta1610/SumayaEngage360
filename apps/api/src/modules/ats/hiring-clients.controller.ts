import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { CreateHiringClientDto, UpdateHiringClientDto } from './ats.dto';
import { HiringClientsService } from './hiring-clients.service';

@Controller('hiring-clients')
@Roles(Role.TENANT_ADMIN, Role.HR)
export class HiringClientsController {
  constructor(private readonly clients: HiringClientsService) {}

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateHiringClientDto) {
    return this.clients.create(tenantId, dto);
  }

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.clients.findAll(tenantId);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.clients.findOne(tenantId, id);
  }

  @Patch(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateHiringClientDto,
  ) {
    return this.clients.update(tenantId, id, dto);
  }
}
