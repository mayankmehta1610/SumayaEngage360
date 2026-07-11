import { Module } from '@nestjs/common';
import { ApprovalsModule } from '../approvals/approvals.module';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [ApprovalsModule],
  controllers: [DashboardController],
})
export class DashboardModule {}
