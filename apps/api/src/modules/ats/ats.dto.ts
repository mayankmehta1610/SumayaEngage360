import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsObject,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  ApplicationStatus,
  InterviewResult,
  JobStatus,
} from '@prisma/client';

// ── Hiring clients ──────────────────────────────────────────────

export class CreateHiringClientDto {
  @IsString()
  name: string;

  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]*$/)
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}

export class UpdateHiringClientDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ── Jobs ────────────────────────────────────────────────────────

export class InterviewPlanRoundDto {
  @IsInt()
  @Min(1)
  level: number;

  @IsString()
  name: string;
}

export class CreateJobDto {
  @IsOptional()
  @IsString()
  hiringClientId?: string;

  @IsString()
  title: string;

  @IsString()
  description: string; // full JD

  @IsInt()
  @Min(1)
  vacancies: number;

  // Display location; auto-composed from the structured geo below when omitted.
  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsString()
  stateId?: string;

  @IsOptional()
  @IsString()
  cityId?: string;

  @IsOptional()
  @IsIn(['ONSITE', 'HYBRID', 'REMOTE'])
  workMode?: string;

  @IsOptional()
  @IsString()
  employmentType?: string;

  @IsOptional()
  @IsNumber()
  minExperience?: number;

  @IsOptional()
  @IsNumber()
  maxExperience?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InterviewPlanRoundDto)
  interviewPlan?: InterviewPlanRoundDto[];
}

export class UpdateJobDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  vacancies?: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsString()
  stateId?: string;

  @IsOptional()
  @IsString()
  cityId?: string;

  @IsOptional()
  @IsIn(['ONSITE', 'HYBRID', 'REMOTE'])
  workMode?: string;

  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;
}

// ── Applications (public apply) ─────────────────────────────────

export class ExperienceDto {
  @IsString()
  company: string;

  @IsString()
  title: string;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class EducationDto {
  @IsString()
  institution: string;

  @IsString()
  degree: string;

  @IsString()
  field: string;

  @IsInt()
  @Min(1950)
  @Max(2100)
  year: number;
}

export class ContactDto {
  @IsString()
  name: string;

  @IsString()
  relationship: string;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;
}

export class ApplyDto {
  @IsString()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  phone: string;

  @IsString()
  city: string;

  @IsString()
  country: string;

  // Structured geo (optional — sent when the applicant picks from the
  // country/state/city selectors instead of free text).
  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsString()
  stateId?: string;

  @IsOptional()
  @IsString()
  cityId?: string;

  @IsString()
  linkedIn: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsString()
  professionalSummary: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  domainExpertise: string[];

  @IsNumber()
  @Min(0)
  yearsExperience: number;

  // Skills are tagged at application time (carried into onboarding).
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  skills: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => ExperienceDto)
  experiences: ExperienceDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => EducationDto)
  education: EducationDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => ContactDto)
  contacts: ContactDto[];

  // FileObject id from the resume upload endpoint; LLM parsing planned.
  @IsString()
  resumeFileId: string;

  @IsOptional()
  @IsString()
  coverLetterFileId?: string;

  @IsOptional()
  @IsObject()
  customFields?: Record<string, unknown>;
}

export class UpdateApplicationStatusDto {
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;
}

export class UpsertApplicationProfileDto {
  @IsOptional()
  @IsString()
  professionalSummary?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  domainExpertise?: string[];

  @IsOptional()
  @IsArray()
  education?: unknown[];

  @IsOptional()
  @IsString()
  coverLetterFileId?: string;

  @IsOptional()
  @IsArray()
  contacts?: unknown[];

  @IsOptional()
  customFields?: Record<string, unknown>;
}

// ── Interviews ──────────────────────────────────────────────────

export class ScheduleInterviewDto {
  @IsInt()
  @Min(1)
  level: number;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  interviewerId?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  mode?: string; // TEAMS | ZOOM | IN_PERSON…

  @IsOptional()
  @IsString()
  meetingLink?: string;
}

export class RecordInterviewResultDto {
  @IsOptional()
  @IsString()
  feedback?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  rating?: number;

  @IsEnum(InterviewResult)
  result: InterviewResult;

  // Recording from any tool (Teams etc.) — file upload or external link.
  @IsOptional()
  @IsString()
  recordingFileId?: string;

  @IsOptional()
  @IsString()
  recordingUrl?: string;

  // Mandatory proof the interview happened (enforced in service on PASS/FAIL).
  @IsOptional()
  @IsString()
  screenshotFileId?: string;
}

// ── Offers ──────────────────────────────────────────────────────

export class CreateOfferDto {
  @IsString()
  designation: string;

  @IsNumber()
  @Min(0)
  annualCtc: number;

  // component breakdown — becomes the employee's first SalaryStructure
  @IsObject()
  salaryBreakup: Record<string, unknown>;

  @IsDateString()
  joiningDate: string;

  @IsString()
  location: string;
}
