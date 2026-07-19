import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { TenantBrandingController } from './tenant-branding.controller';
import { TenantContextController } from './tenant-context.controller';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

@Module({
  imports: [FilesModule],
  controllers: [TenantsController, TenantContextController, TenantBrandingController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
