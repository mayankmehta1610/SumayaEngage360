-- Multi-tenant-type platform: tenant types, rich application profiles,
-- configurable fields, agency submissions, contractor assignments.

CREATE TYPE "TenantType" AS ENUM ('COMPANY', 'RECRUITMENT_AGENCY', 'STAFFING_COMPANY', 'INDIVIDUAL_RECRUITER');
CREATE TYPE "TenantFieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'SELECT', 'MULTI_SELECT', 'BOOLEAN', 'TEXTAREA');
CREATE TYPE "AgencySubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'REJECTED', 'WITHDRAWN');
CREATE TYPE "AgencyContactType" AS ENUM ('CLIENT', 'HIRING_MANAGER', 'RECRUITER', 'VENDOR', 'OTHER');
CREATE TYPE "ContractorStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'TERMINATED');

ALTER TABLE "tenants" ADD COLUMN "tenantType" "TenantType" NOT NULL DEFAULT 'COMPANY';
ALTER TABLE "tenants" ADD COLUMN "onboardingQuestionnaire" JSONB;
ALTER TABLE "tenants" ADD COLUMN "enabledPortals" JSONB;

CREATE TABLE "tenant_field_definitions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "TenantFieldType" NOT NULL DEFAULT 'TEXT',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tenant_field_definitions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tenant_field_definitions_tenantId_entity_fieldKey_key" ON "tenant_field_definitions"("tenantId", "entity", "fieldKey");
CREATE INDEX "tenant_field_definitions_tenantId_entity_idx" ON "tenant_field_definitions"("tenantId", "entity");

CREATE TABLE "application_profiles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "professionalSummary" TEXT,
    "domainExpertise" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "education" JSONB,
    "coverLetterFileId" TEXT,
    "contacts" JSONB,
    "customFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "application_profiles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "application_profiles_applicationId_key" ON "application_profiles"("applicationId");
CREATE INDEX "application_profiles_tenantId_idx" ON "application_profiles"("tenantId");
ALTER TABLE "application_profiles" ADD CONSTRAINT "application_profiles_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "agency_client_submissions" (
    "id" TEXT NOT NULL,
    "agencyTenantId" TEXT NOT NULL,
    "clientTenantId" TEXT,
    "clientName" TEXT,
    "jobId" TEXT,
    "candidateId" TEXT NOT NULL,
    "status" "AgencySubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "agency_client_submissions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "agency_client_submissions_agencyTenantId_status_idx" ON "agency_client_submissions"("agencyTenantId", "status");
ALTER TABLE "agency_client_submissions" ADD CONSTRAINT "agency_client_submissions_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "agency_contacts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "AgencyContactType" NOT NULL DEFAULT 'CLIENT',
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "agency_contacts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "agency_contacts_tenantId_type_idx" ON "agency_contacts"("tenantId", "type");

CREATE TABLE "contractor_assignments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT,
    "candidateId" TEXT,
    "contractId" TEXT,
    "clientRef" TEXT,
    "role" TEXT,
    "rate" DECIMAL(65,30),
    "rateType" TEXT NOT NULL DEFAULT 'HOURLY',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "ContractorStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "contractor_assignments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "contractor_assignments_tenantId_status_idx" ON "contractor_assignments"("tenantId", "status");
