import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { TimesheetType } from '@prisma/client';

export class TimesheetEntryDto {
  @IsDateString()
  workDate: string;

  @IsNumber()
  @Min(0)
  @Max(24)
  hours: number;

  @IsOptional()
  @IsString()
  task?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateTimesheetDto {
  @IsEnum(TimesheetType)
  type: TimesheetType; // INTERNAL | CLIENT

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsDateString()
  periodStart: string;

  @IsDateString()
  periodEnd: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimesheetEntryDto)
  entries: TimesheetEntryDto[];
}

export class TimesheetActionDto {
  @IsOptional()
  @IsString()
  note?: string;
}
