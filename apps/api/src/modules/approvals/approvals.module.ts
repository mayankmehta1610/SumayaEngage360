import { Module } from '@nestjs/common';
import { ApprovalsController } from './approvals.controller';
import { ApprovalsService } from './approvals.service';
import { ApprovalsSlaCronService } from './approvals-sla.cron.service';

@Module({
  controllers: [ApprovalsController],
  providers: [ApprovalsService, ApprovalsSlaCronService],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
