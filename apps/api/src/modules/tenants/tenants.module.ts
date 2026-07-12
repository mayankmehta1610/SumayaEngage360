import { Module } from '@nestjs/common';
import { TenantContextController } from './tenant-context.controller';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

@Module({
  controllers: [TenantsController, TenantContextController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
