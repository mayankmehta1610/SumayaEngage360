import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsObject,
  IsDateString,
  IsEnum,
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

  @IsString()
  location: string;

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

export class ApplyDto {
  @IsString()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  phone?: string;

  // dob, gender, address, nationality…
  @IsOptional()
  @IsObject()
  demographics?: Record<string, unknown>;

  // Skills are tagged at application time (carried into onboarding).
  @IsArray()
  @IsString({ each: true })
  skills: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperienceDto)
  experiences?: ExperienceDto[];

  // FileObject id from the resume upload endpoint; LLM parsing planned.
  @IsOptional()
  @IsString()
  resumeFileId?: string;
}

export class UpdateApplicationStatusDto {
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;
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
