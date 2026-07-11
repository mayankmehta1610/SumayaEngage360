import { Module } from '@nestjs/common';
import { PayrollController } from './payroll.controller';
import { PayrollExtrasController } from './payroll-extras.controller';
import { PayrollService } from './payroll.service';

@Module({
  controllers: [PayrollController, PayrollExtrasController],
  providers: [PayrollService],
  exports: [PayrollService],
})
export class PayrollModule {}
