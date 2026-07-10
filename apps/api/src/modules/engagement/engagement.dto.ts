import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { FeedbackType } from '@prisma/client';

export class GiveRecognitionDto {
  @IsString()
  receiverId: string; // employee id

  @IsString()
  badge: string; // "Star Performer", "Team Player"…

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  points?: number;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class GiveFeedbackDto {
  @IsString()
  receiverId: string; // employee id

  @IsEnum(FeedbackType)
  type: FeedbackType; // MANAGER_TO_EMPLOYEE | EMPLOYEE_TO_MANAGER | PEER | THREE_SIXTY

  @IsOptional()
  @IsBoolean()
  anonymous?: boolean;

  content: Record<string, unknown>;

  @IsOptional()
  @IsString()
  cycleId?: string; // bind to an appraisal cycle
}
