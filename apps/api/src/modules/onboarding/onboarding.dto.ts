import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { BgcStatus } from '@prisma/client';

export class DocumentRequirementDto {
  @IsString()
  country: string;

  @IsString()
  code: string; // AADHAAR, PAN, PASSPORT…

  @IsString()
  name: string;

  @IsOptional()
  @IsBoolean()
  mandatory?: boolean;
}

export class SubmitDocumentDto {
  @IsString()
  code: string;

  @IsString()
  fileId: string;
}

export class OnboardingSkillsDto {
  @IsArray()
  @IsString({ each: true })
  skills: string[];
}

export class CompleteOnboardingDto {
  // The new employee sets their login password when submitting everything.
  @IsString()
  @MinLength(8)
  password: string;
}

export class VerifyDocumentDto {
  @IsBoolean()
  approve: boolean;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class CreateBgcVendorDto {
  @IsString()
  name: string;

  @IsString()
  email: string;
}

export class SubmitBgcDto {
  @IsString()
  vendorId: string;
}

export class BgcReportDto {
  @IsEnum(BgcStatus)
  status: BgcStatus;

  @IsOptional()
  @IsString()
  reportFileId?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class CreatePolicyDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsString()
  fileId?: string;

  @IsOptional()
  @IsString()
  bodyHtml?: string;

  @IsOptional()
  @IsBoolean()
  mandatory?: boolean;
}
