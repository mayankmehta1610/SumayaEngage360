import { Module } from '@nestjs/common';
import { ApprovalsModule } from '../approvals/approvals.module';
import { ExitController } from './exit.controller';
import { ExitService } from './exit.service';

@Module({
  imports: [ApprovalsModule],
  controllers: [ExitController],
  providers: [ExitService],
})
export class ExitModule {}
