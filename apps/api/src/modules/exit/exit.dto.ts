import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class SubmitResignationDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsDateString()
  requestedLastDay?: string;
}

export class AcceptResignationDto {
  @IsDateString()
  agreedLastDay: string;
}

export class ClearanceActionDto {
  @IsOptional()
  @IsString()
  remarks?: string;
}

export class DelegateClearanceDto {
  @IsString()
  assigneeId: string; // subordinate employee id
}

export class FnfDto {
  // earnings, deductions, notice recovery, leave encashment…
  breakup: Record<string, unknown>;

  @IsNumber()
  netPayable: number;
}
