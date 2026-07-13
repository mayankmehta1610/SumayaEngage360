ALTER TABLE "tenants" ADD COLUMN "operatingCountries" JSONB;

ALTER TABLE "agency_client_submissions"
  ADD COLUMN "jurisdictionCode" TEXT,
  ADD COLUMN "complianceSnapshot" JSONB;

ALTER TABLE "agency_contacts"
  ADD COLUMN "jurisdictionCode" TEXT,
  ADD COLUMN "registrationNumber" TEXT,
  ADD COLUMN "taxIdentifier" TEXT,
  ADD COLUMN "requirements" JSONB,
  ADD COLUMN "lifecycleStatus" TEXT NOT NULL DEFAULT 'PROSPECT';

CREATE TABLE "candidate_jurisdiction_profiles" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "jurisdictionCode" TEXT NOT NULL,
  "memberStateCode" TEXT NOT NULL DEFAULT '',
  "nationality" TEXT,
  "residenceCountry" TEXT,
  "personalData" JSONB,
  "identifiers" JSONB,
  "emergencyContacts" JSONB,
  "consents" JSONB,
  "completionStatus" TEXT NOT NULL DEFAULT 'DRAFT',
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "candidate_jurisdiction_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "work_authorization_cases" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "caseNumber" TEXT NOT NULL,
  "jurisdictionCode" TEXT NOT NULL,
  "memberStateCode" TEXT,
  "authorizationType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "sponsorshipRequired" BOOLEAN NOT NULL DEFAULT false,
  "employerSpecific" BOOLEAN NOT NULL DEFAULT false,
  "employerName" TEXT,
  "jobId" TEXT,
  "validFrom" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "verificationMethod" TEXT,
  "verificationReference" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "verifiedBy" TEXT,
  "restrictions" JSONB,
  "checklist" JSONB,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "work_authorization_cases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "candidate_jurisdiction_profiles_tenantId_candidateId_jurisdictionCode_memberStateCode_key"
  ON "candidate_jurisdiction_profiles"("tenantId", "candidateId", "jurisdictionCode", "memberStateCode");
CREATE INDEX "candidate_jurisdiction_profiles_tenantId_jurisdictionCode_completionStatus_idx"
  ON "candidate_jurisdiction_profiles"("tenantId", "jurisdictionCode", "completionStatus");
CREATE UNIQUE INDEX "work_authorization_cases_caseNumber_key" ON "work_authorization_cases"("caseNumber");
CREATE INDEX "work_authorization_cases_tenantId_jurisdictionCode_status_idx"
  ON "work_authorization_cases"("tenantId", "jurisdictionCode", "status");
CREATE INDEX "work_authorization_cases_tenantId_candidateId_idx"
  ON "work_authorization_cases"("tenantId", "candidateId");
CREATE INDEX "work_authorization_cases_tenantId_expiresAt_idx"
  ON "work_authorization_cases"("tenantId", "expiresAt");

ALTER TABLE "candidate_jurisdiction_profiles"
  ADD CONSTRAINT "candidate_jurisdiction_profiles_candidateId_fkey"
  FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_authorization_cases"
  ADD CONSTRAINT "work_authorization_cases_candidateId_fkey"
  FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
