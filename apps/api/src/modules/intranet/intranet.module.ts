import { Module } from '@nestjs/common';
import { ApprovalsModule } from '../approvals/approvals.module';
import { FilesModule } from '../files/files.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { IntranetController } from './intranet.controller';
import { IntranetService } from './intranet.service';

@Module({
  imports: [FilesModule, ApprovalsModule, NotificationsModule],
  controllers: [IntranetController],
  providers: [IntranetService],
})
export class IntranetModule {}
