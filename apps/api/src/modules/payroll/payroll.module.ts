import { Module } from '@nestjs/common';
import { PayrollController } from './payroll.controller';
import { PayrollExtrasController } from './payroll-extras.controller';
import { PayrollService } from './payroll.service';
import { IndiaStatutoryController } from './india-statutory.controller';
import { IndiaStatutoryService } from './india-statutory.service';

@Module({
  controllers: [PayrollController, PayrollExtrasController, IndiaStatutoryController],
  providers: [PayrollService, IndiaStatutoryService],
  exports: [PayrollService, IndiaStatutoryService],
})
export class PayrollModule {}
