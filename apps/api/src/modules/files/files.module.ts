import { Module } from '@nestjs/common';
import { FileSecurityService } from './file-security.service';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

@Module({
  controllers: [FilesController],
  providers: [FilesService, FileSecurityService],
  exports: [FilesService, FileSecurityService],
})
export class FilesModule {}
