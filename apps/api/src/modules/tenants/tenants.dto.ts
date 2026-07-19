import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { TenantType } from '@prisma/client';

export class CreateTenantDto {
  @IsString()
  name: string;

  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/, {
    message: 'subdomain must be lowercase letters, digits and hyphens',
  })
  subdomain: string;

  @IsOptional()
  @IsEnum(TenantType)
  tenantType?: TenantType;

  @IsOptional()
  @IsObject()
  onboardingQuestionnaire?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledPortals?: string[];

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  operatingCountries?: string[];

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsEmail()
  adminEmail: string;

  @IsString()
  @MinLength(8)
  adminPassword: string;

  @IsString()
  adminFirstName: string;

  @IsString()
  adminLastName: string;
}

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(TenantType)
  tenantType?: TenantType;

  @IsOptional()
  @IsObject()
  onboardingQuestionnaire?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledPortals?: string[];

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  operatingCountries?: string[];

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateBrandingDto {
  @IsOptional()
  @IsString()
  logoFileId?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  // Empty string clears the value back to the platform default.
  @IsOptional()
  @Matches(/^$|^#[0-9a-fA-F]{6}$/, { message: 'brandPrimaryColor must be a hex color like #0f6cbd' })
  brandPrimaryColor?: string;

  @IsOptional()
  @Matches(/^$|^#[0-9a-fA-F]{6}$/, { message: 'brandAccentColor must be a hex color like #6d28d9' })
  brandAccentColor?: string;

  @IsOptional()
  @IsString()
  brandTagline?: string;
}

export class OnboardingWizardDto {
  @IsEnum(TenantType)
  tenantType: TenantType;

  @IsOptional()
  @IsObject()
  questionnaire?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledPortals?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  operatingCountries?: string[];

  @IsOptional()
  @IsString()
  primaryCountry?: string;
}

export class PatchOnboardingDto {
  @IsOptional()
  @IsObject()
  questionnaire?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledPortals?: string[];
}
