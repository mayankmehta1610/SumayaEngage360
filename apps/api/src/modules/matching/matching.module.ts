import { Module } from '@nestjs/common';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';
import { ParserCronService } from './parser-cron.service';

@Module({
  controllers: [MatchingController],
  providers: [MatchingService, ParserCronService],
  exports: [MatchingService],
})
export class MatchingModule {}
