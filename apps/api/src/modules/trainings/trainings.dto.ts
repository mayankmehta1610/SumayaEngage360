import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateVideoDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  fileId?: string;

  @IsOptional()
  @IsString()
  streamUrl?: string;

  @IsInt()
  @Min(1)
  durationSeconds: number;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  noSkip?: boolean; // default true — locked player
}

export class CreateCourseDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  mandatory?: boolean;

  @IsOptional()
  @IsBoolean()
  forOnboarding?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVideoDto)
  videos?: CreateVideoDto[];
}

export class CreateQuizDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  passingScore?: number;

  // [{q:"…",options:["a","b","c"],answerIndex:0},…]
  @IsArray()
  questions: { q: string; options: string[]; answerIndex: number }[];
}

export class AssignCourseDto {
  @IsArray()
  @IsString({ each: true })
  employeeIds: string[];

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class ProgressHeartbeatDto {
  // player's current position; the server decides how much of it to trust
  @IsInt()
  @Min(0)
  positionSeconds: number;
}

export class QuizAttemptDto {
  @IsArray()
  @IsInt({ each: true })
  answers: number[]; // selected option index per question
}
