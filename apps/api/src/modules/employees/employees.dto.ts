import {
  IsArray,
  IsDateString,
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  headId?: string; // employee id
}

export class CreateDesignationDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsInt()
  level?: number;
}

export class CreateEmployeeDto {
  @IsEmail()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  designation: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  managerId?: string;

  @IsOptional()
  @IsDateString()
  joinDate?: string;

  @IsOptional()
  @IsString()
  location?: string;
}

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  designation?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  managerId?: string;

  @IsOptional()
  @IsString()
  location?: string;
}

export class AddSkillsDto {
  @IsArray()
  @IsString({ each: true })
  skills: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  yearsOfExp?: number;
}

export class SalaryStructureDto {
  @IsNumber()
  @Min(0)
  annualCtc: number;

  // [{code,name,monthly,type:"EARNING"|"DEDUCTION"|"TAX"},…]
  components: Record<string, unknown>[];

  @IsDateString()
  effectiveFrom: string;
}
