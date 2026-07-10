import { Global, Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { MailService } from './mail.service';
import { PdfService } from './pdf.service';
import { ResumeParserService } from './resume-parser.service';

@Global()
@Module({
  imports: [FilesModule],
  providers: [MailService, PdfService, ResumeParserService],
  exports: [MailService, PdfService, ResumeParserService],
})
export class IntegrationsModule {}
