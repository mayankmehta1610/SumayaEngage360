-- Sheets 1-12 completion: SFTP, roster, geofence, workflow versions, execution evidence

CREATE TABLE "engage360"."sftp_import_jobs" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "remotePath" TEXT NOT NULL,
    "entityType" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rowsImported" INTEGER NOT NULL DEFAULT 0, "log" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completedAt" TIMESTAMP(3),
    CONSTRAINT "sftp_import_jobs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "sftp_import_jobs_tenantId_status_idx" ON "engage360"."sftp_import_jobs"("tenantId", "status");

CREATE TABLE "engage360"."roster_shifts" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "employeeId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL, "date" TIMESTAMP(3) NOT NULL, "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "roster_shifts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "roster_shifts_tenantId_employeeId_date_key" ON "engage360"."roster_shifts"("tenantId", "employeeId", "date");

CREATE TABLE "engage360"."geofence_zones" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL, "longitude" DOUBLE PRECISION NOT NULL,
    "radiusM" INTEGER NOT NULL DEFAULT 200, "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "geofence_zones_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "geofence_zones_tenantId_name_key" ON "engage360"."geofence_zones"("tenantId", "name");

CREATE TABLE "engage360"."workflow_versions" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "workflowId" TEXT NOT NULL,
    "version" INTEGER NOT NULL, "definition" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workflow_versions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "workflow_versions_workflowId_version_key" ON "engage360"."workflow_versions"("workflowId", "version");
ALTER TABLE "engage360"."workflow_versions" ADD CONSTRAINT "workflow_versions_workflowId_fkey"
    FOREIGN KEY ("workflowId") REFERENCES "engage360"."approval_workflows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "engage360"."execution_evidence" ("id", "step", "sheetRef", "evidence", "status", "createdAt") VALUES
('ev-sftp', '8', '12_AI_Execution', 'INT-018 SFTP import adapter', 'DONE', NOW()),
('ev-adapters', '8', '12_AI_Execution', 'INT-001..018 integration adapters', 'DONE', NOW()),
('ev-sso', '7', '12_AI_Execution', 'OIDC SSO validation service', 'DONE', NOW()),
('ev-roster', '6', '12_AI_Execution', 'Roster + geofencing config', 'DONE', NOW()),
('ev-wfver', '4', '12_AI_Execution', 'Workflow versioning API', 'DONE', NOW())
ON CONFLICT (id) DO UPDATE SET status = 'DONE';
