import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayMinSize,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApprovalEntity } from '@prisma/client';

export class ApprovalStepDto {
  @IsInt()
  @Min(1)
  stepOrder: number;

  // How the approver is resolved at runtime.
  @IsIn(['DESIGNATION', 'DEPARTMENT_HEAD', 'REPORTING_MANAGER', 'USER'])
  approverType: string;

  @IsOptional()
  @IsString()
  approverValue?: string; // designation name or user id
}

export class CreateWorkflowDto {
  @IsEnum(ApprovalEntity)
  entityType: ApprovalEntity;

  @IsString()
  name: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ApprovalStepDto)
  steps: ApprovalStepDto[];
}

export class ApprovalActionDto {
  @IsIn(['APPROVED', 'REJECTED', 'DELEGATED'])
  action: string;

  @IsOptional()
  @IsString()
  comment?: string;

  // required when action = DELEGATED
  @IsOptional()
  @IsString()
  delegateUserId?: string;
}
