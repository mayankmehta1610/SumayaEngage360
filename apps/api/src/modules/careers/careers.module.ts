import { Module } from '@nestjs/common';
import { AtsModule } from '../ats/ats.module';
import { CareersController } from './careers.controller';
import { CareersService } from './careers.service';

@Module({
  imports: [AtsModule],
  controllers: [CareersController],
  providers: [CareersService],
})
export class CareersModule {}
