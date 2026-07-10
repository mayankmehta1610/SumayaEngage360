import { Module } from '@nestjs/common';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';

@Module({
  controllers: [DepartmentsController, EmployeesController],
  providers: [DepartmentsService, EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
