CREATE TABLE "jurisdiction_employer_profiles" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "jurisdictionCode" TEXT NOT NULL,
  "memberStateCode" TEXT NOT NULL DEFAULT '',
  "profileName" TEXT NOT NULL,
  "legalEntityId" TEXT,
  "locationId" TEXT,
  "data" JSONB,
  "identifiers" JSONB,
  "registrations" JSONB,
  "contacts" JSONB,
  "completionStatus" TEXT NOT NULL DEFAULT 'DRAFT',
  "verifiedBy" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "reviewDueAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "jurisdiction_employer_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "jurisdiction_employer_profiles_tenantId_jurisdictionCode_memberStateCode_profileName_key"
  ON "jurisdiction_employer_profiles"("tenantId", "jurisdictionCode", "memberStateCode", "profileName");
CREATE INDEX "jurisdiction_employer_profiles_tenantId_jurisdictionCode_completionStatus_idx"
  ON "jurisdiction_employer_profiles"("tenantId", "jurisdictionCode", "completionStatus");
CREATE INDEX "jurisdiction_employer_profiles_tenantId_reviewDueAt_idx"
  ON "jurisdiction_employer_profiles"("tenantId", "reviewDueAt");

INSERT INTO "report_definitions" ("id", "code", "name", "audience", "filters", "priority", "active", "createdAt")
VALUES (
  'rpt026',
  'RPT-026',
  'Global Mobility and Work Authorization',
  'Leadership / HR / Mobility / Compliance',
  'Jurisdiction, member state, employer profile, authorization status, sponsorship, expiry window and completion status',
  'Must',
  true,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "audience" = EXCLUDED."audience",
  "filters" = EXCLUDED."filters",
  "priority" = EXCLUDED."priority",
  "active" = true;
