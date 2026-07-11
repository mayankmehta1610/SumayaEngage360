import {
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { CycleFrequency } from '@prisma/client';

export class CreateCycleDto {
  @IsString()
  name: string; // "FY27 Q1"

  @IsEnum(CycleFrequency)
  frequency: CycleFrequency; // QUARTERLY | HALF_YEARLY | YEARLY | CUSTOM…

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  // Fully customizable template: sections, KRAs, competencies, rating scale.
  @IsObject()
  template: Record<string, unknown>;
}

export class SelfReviewDto {
  @IsObject()
  review: Record<string, unknown>;
}

export class ManagerReviewDto {
  @IsObject()
  review: Record<string, unknown>;

  @IsOptional()
  @IsString()
  rating?: string;
}

export class FinalizeDto {
  @IsString()
  finalRating: string;

  // increment %, promotion, benefits granted…
  @IsOptional()
  @IsObject()
  outcome?: Record<string, unknown>;
}
