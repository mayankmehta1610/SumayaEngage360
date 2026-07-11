import { Module } from '@nestjs/common';
import { ManpowerController } from './manpower.controller';
import { ManpowerService } from './manpower.service';

@Module({
  controllers: [ManpowerController],
  providers: [ManpowerService],
})
export class ManpowerModule {}
