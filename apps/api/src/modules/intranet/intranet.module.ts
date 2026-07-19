import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { IntranetController } from './intranet.controller';
import { IntranetService } from './intranet.service';

@Module({
  imports: [FilesModule],
  controllers: [IntranetController],
  providers: [IntranetService],
})
export class IntranetModule {}
