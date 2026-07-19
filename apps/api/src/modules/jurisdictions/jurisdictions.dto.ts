import { Transform } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsIn, IsISO8601, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

const upper = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toUpperCase() : value;

export class ConfigureJurisdictionsDto {
  @IsArray() @ArrayMinSize(1) @IsString({ each: true }) operatingCountries: string[];
  @Transform(upper) @IsString() primaryCountry: string;
}

export class UpsertJurisdictionProfileDto {
  @Transform(upper) @IsString() jurisdictionCode: string;
  @IsOptional() @Transform(upper) @IsString() memberStateCode?: string;
  @IsOptional() @IsString() nationality?: string;
  @IsOptional() @Transform(upper) @IsString() residenceCountry?: string;
  @IsOptional() @IsObject() personalData?: Record<string, unknown>;
  @IsOptional() @IsObject() identifiers?: Record<string, unknown>;
  @IsOptional() @IsArray() emergencyContacts?: unknown[];
  @IsOptional() @IsObject() consents?: Record<string, unknown>;
  @IsOptional() @IsIn(['DRAFT', 'READY_FOR_REVIEW', 'COMPLETE']) completionStatus?: string;
}

export class UpsertEmployerProfileDto {
  @Transform(upper) @IsString() jurisdictionCode: string;
  @IsOptional() @Transform(upper) @IsString() memberStateCode?: string;
  @IsString() profileName: string;
  @IsOptional() @IsUUID() legalEntityId?: string;
  @IsOptional() @IsUUID() locationId?: string;
  @IsOptional() @IsObject() data?: Record<string, unknown>;
  @IsOptional() @IsObject() identifiers?: Record<string, unknown>;
  @IsOptional() @IsObject() registrations?: Record<string, unknown>;
  @IsOptional() @IsObject() contacts?: Record<string, unknown>;
  @IsOptional() @IsIn(['DRAFT', 'READY_FOR_REVIEW', 'VERIFIED']) completionStatus?: string;
  @IsOptional() @IsISO8601() reviewDueAt?: string;
}

export class CreateWorkAuthorizationDto {
  @IsUUID() candidateId: string;
  @Transform(upper) @IsString() jurisdictionCode: string;
  @IsOptional() @Transform(upper) @IsString() memberStateCode?: string;
  @IsString() authorizationType: string;
  @IsOptional() @IsBoolean() sponsorshipRequired?: boolean;
  @IsOptional() @IsBoolean() employerSpecific?: boolean;
  @IsOptional() @IsString() employerName?: string;
  @IsOptional() @IsUUID() jobId?: string;
  @IsOptional() @IsISO8601() validFrom?: string;
  @IsOptional() @IsISO8601() expiresAt?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateWorkAuthorizationDto {
  @IsOptional() @IsIn(['DRAFT', 'ASSESSMENT', 'DOCUMENTS_PENDING', 'SPONSORSHIP', 'VERIFICATION_PENDING', 'VERIFIED', 'REJECTED', 'CLOSED']) status?: string;
  @IsOptional() @IsString() verificationMethod?: string;
  @IsOptional() @IsString() verificationReference?: string;
  @IsOptional() @IsISO8601() verifiedAt?: string;
  @IsOptional() @IsISO8601() validFrom?: string;
  @IsOptional() @IsISO8601() expiresAt?: string;
  @IsOptional() @IsObject() restrictions?: Record<string, unknown>;
  @IsOptional() @IsObject() checklist?: Record<string, unknown>;
  @IsOptional() @IsString() notes?: string;
}
