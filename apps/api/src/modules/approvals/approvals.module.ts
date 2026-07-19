import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { ApprovalsController } from './approvals.controller';
import { ApprovalsService } from './approvals.service';
import { ApprovalsSlaCronService } from './approvals-sla.cron.service';

@Module({
  imports: [NotificationsModule],
  controllers: [ApprovalsController],
  providers: [ApprovalsService, ApprovalsSlaCronService],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
