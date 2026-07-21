import { Module } from '@nestjs/common';
import { AtsModule } from '../ats/ats.module';
import { MatchingModule } from '../matching/matching.module';
import { CareersController } from './careers.controller';
import { CareersService } from './careers.service';

@Module({
  imports: [AtsModule, MatchingModule],
  controllers: [CareersController],
  providers: [CareersService],
})
export class CareersModule {}
