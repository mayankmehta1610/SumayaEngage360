import { Global, Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { IntegrationAdaptersService } from './integration-adapters.service';
import { IntegrationsRegistryController } from './integrations-registry.controller';
import { IntegrationsRegistryService } from './integrations-registry.service';
import { MailService } from './mail.service';
import { PdfService } from './pdf.service';
import { ResumeParserService } from './resume-parser.service';
import { SftpImportController } from './sftp-import.controller';
import { SftpImportService } from './sftp-import.service';

@Global()
@Module({
  imports: [FilesModule],
  controllers: [IntegrationsRegistryController, SftpImportController],
  providers: [
    MailService, PdfService, ResumeParserService,
    IntegrationAdaptersService, IntegrationsRegistryService, SftpImportService,
  ],
  exports: [MailService, PdfService, ResumeParserService, IntegrationsRegistryService, IntegrationAdaptersService],
})
export class IntegrationsModule {}
