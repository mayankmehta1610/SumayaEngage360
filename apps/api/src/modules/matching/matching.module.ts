import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';
import { ParserCronService } from './parser-cron.service';
import { ResumeExtractorService } from './resume-extractor.service';

@Module({
  imports: [FilesModule],
  controllers: [MatchingController],
  providers: [MatchingService, ParserCronService, ResumeExtractorService],
  exports: [MatchingService, ResumeExtractorService],
})
export class MatchingModule {}
