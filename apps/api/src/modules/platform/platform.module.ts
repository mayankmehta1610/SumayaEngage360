import { Module } from '@nestjs/common';
import { PlatformController } from './platform.controller';
import { OpenApiService } from './openapi.service';

@Module({
  controllers: [PlatformController],
  providers: [OpenApiService],
  exports: [OpenApiService],
})
export class PlatformModule {}
