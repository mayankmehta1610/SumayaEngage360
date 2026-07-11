-- Compliance cases (POSH / whistleblower / disciplinary / incidents) + retention
CREATE TYPE "ComplianceCaseType" AS ENUM ('POSH', 'WHISTLEBLOWER', 'DISCIPLINARY', 'INCIDENT', 'CONFLICT_OF_INTEREST', 'GRIEVANCE');
CREATE TYPE "ComplianceCaseStatus" AS ENUM ('OPEN', 'UNDER_INVESTIGATION', 'RESOLVED', 'DISMISSED');

CREATE TABLE "compliance_cases" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "ComplianceCaseType" NOT NULL,
    "status" "ComplianceCaseStatus" NOT NULL DEFAULT 'OPEN',
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "reporterId" TEXT,
    "subjectEmployeeId" TEXT,
    "title" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "assigneeId" TEXT,
    "resolution" TEXT,
    "legalHold" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    CONSTRAINT "compliance_cases_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "compliance_cases_tenantId_status_idx" ON "compliance_cases"("tenantId", "status");

CREATE TABLE "retention_policies" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "retainMonths" INTEGER NOT NULL,
    "purgeEnabled" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "retention_policies_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "retention_policies_tenantId_entity_key" ON "retention_policies"("tenantId", "entity");
