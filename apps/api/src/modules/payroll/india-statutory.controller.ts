import { Body, Controller, Get, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Roles } from '../../common/auth/roles.decorator';
import { IndiaStatutoryService } from './india-statutory.service';

class StatutoryComputeDto {
  @IsNumber()
  @Min(0)
  monthlyGross: number;

  @IsNumber()
  @Min(0)
  monthlyBasic: number;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsIn(['NEW', 'OLD'])
  regime?: 'NEW' | 'OLD';

  @IsOptional()
  @IsNumber()
  @Min(0)
  annualDeclaredDeductions?: number;

  @IsOptional()
  @IsBoolean()
  pfOnActualBasic?: boolean;
}

// India statutory pack: PF/ESI/PT/TDS parameters and calculator.
@Controller('payroll/india')
@Roles(Role.TENANT_ADMIN, Role.HR)
export class IndiaStatutoryController {
  constructor(private readonly statutory: IndiaStatutoryService) {}

  @Get('statutory-config')
  config() {
    return this.statutory.config();
  }

  @Post('statutory')
  compute(@Body() dto: StatutoryComputeDto) {
    return this.statutory.compute(dto);
  }
}
