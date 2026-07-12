import { Module } from '@nestjs/common';
import { ConfigController } from './config.controller';
import { ConfigService } from './config.service';
import { TenantFieldDefinitionsController } from './tenant-field-definitions.controller';

@Module({
  controllers: [ConfigController, TenantFieldDefinitionsController],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
