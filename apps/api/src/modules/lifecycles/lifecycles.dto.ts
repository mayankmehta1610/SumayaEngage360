import { IsArray, IsBoolean, IsIn, IsISO8601, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class EnsureLifecycleDto {
  @IsString() entityType: string;
  @IsString() entityId: string;
  @IsString() workflowCode: string;
  @IsString() title: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class UpdateLifecycleCaseDto {
  @IsOptional() @IsIn(['DRAFT', 'ACTIVE', 'BLOCKED', 'COMPLETED', 'CANCELLED']) status?: string;
  @IsOptional() @IsString() ownerId?: string;
  @IsOptional() @IsString() ownerName?: string;
  @IsOptional() @IsIn(['LOW', 'NORMAL', 'HIGH', 'URGENT']) priority?: string;
  @IsOptional() @IsISO8601() targetDate?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class UpdateLifecycleStageDto {
  @IsOptional() @IsString() ownerId?: string;
  @IsOptional() @IsString() ownerName?: string;
  @IsOptional() @IsISO8601() dueDate?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateLifecycleTaskDto {
  @IsOptional() @IsIn(['PENDING', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'WAIVED']) status?: string;
  @IsOptional() @IsString() ownerId?: string;
  @IsOptional() @IsString() ownerName?: string;
  @IsOptional() @IsISO8601() dueDate?: string;
  @IsOptional() @IsString() evidenceNote?: string;
  @IsOptional() @IsObject() data?: Record<string, unknown>;
}

export class UpdateLifecycleDocumentDto {
  @IsOptional() @IsIn(['ASSIGNED', 'REQUESTED', 'RECEIVED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'WAIVED', 'EXPIRED']) status?: string;
  @IsOptional() @IsString() assignedTo?: string;
  @IsOptional() @IsString() ownerName?: string;
  @IsOptional() @IsISO8601() dueDate?: string;
  @IsOptional() @IsString() fileId?: string;
  @IsOptional() @IsString() fileName?: string;
  @IsOptional() @IsString() referenceNumber?: string;
  @IsOptional() @IsISO8601() issuedAt?: string;
  @IsOptional() @IsISO8601() expiresAt?: string;
  @IsOptional() @IsString() rejectionReason?: string;
  @IsOptional() @IsString() notes?: string;
}

export class AddLifecycleTaskDto {
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() required?: boolean;
  @IsOptional() @IsString() ownerRole?: string;
}

export class AddLifecycleDocumentDto {
  @IsString() title: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() required?: boolean;
  @IsOptional() @IsString() assignedTo?: string;
}
