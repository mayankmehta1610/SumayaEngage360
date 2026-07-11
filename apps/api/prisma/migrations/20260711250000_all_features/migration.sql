-- Remaining feature modules

ALTER TABLE "engage360"."jobs" ADD COLUMN IF NOT EXISTS "vacanciesFilled" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "engage360"."jobs" ADD COLUMN IF NOT EXISTS "headcountBudget" DECIMAL(65,30);
ALTER TABLE "engage360"."jobs" ADD COLUMN IF NOT EXISTS "recruiterIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "engage360"."jobs" ADD COLUMN IF NOT EXISTS "hiringTeamIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "engage360"."jobs" ADD COLUMN IF NOT EXISTS "jobFamilyId" TEXT;

CREATE TABLE IF NOT EXISTS "engage360"."job_families" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL,
    CONSTRAINT "job_families_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "job_families_tenantId_code_key" ON "engage360"."job_families"("tenantId", "code");

CREATE TABLE IF NOT EXISTS "engage360"."org_positions" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "code" TEXT NOT NULL, "title" TEXT NOT NULL,
    "familyId" TEXT, "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "org_positions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "org_positions_tenantId_code_key" ON "engage360"."org_positions"("tenantId", "code");

CREATE TABLE IF NOT EXISTS "engage360"."bgv_packages" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL,
    "checks" JSONB NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "bgv_packages_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "bgv_packages_tenantId_code_key" ON "engage360"."bgv_packages"("tenantId", "code");

CREATE TABLE IF NOT EXISTS "engage360"."job_team_members" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "jobId" TEXT NOT NULL, "userId" TEXT NOT NULL, "role" TEXT NOT NULL,
    CONSTRAINT "job_team_members_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "job_team_members_jobId_userId_role_key" ON "engage360"."job_team_members"("jobId", "userId", "role");

CREATE TABLE IF NOT EXISTS "engage360"."approval_delegations" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "delegatorId" TEXT NOT NULL, "delegateId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL, "endsAt" TIMESTAMP(3), "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "approval_delegations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "engage360"."workflow_rules" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "ruleType" TEXT NOT NULL, "name" TEXT NOT NULL,
    "definition" JSONB NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "workflow_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "engage360"."rating_scales" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "name" TEXT NOT NULL, "levels" JSONB NOT NULL,
    CONSTRAINT "rating_scales_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "rating_scales_tenantId_name_key" ON "engage360"."rating_scales"("tenantId", "name");

CREATE TABLE IF NOT EXISTS "engage360"."performance_checkins" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "employeeId" TEXT NOT NULL, "managerId" TEXT,
    "notes" TEXT NOT NULL, "mood" INTEGER, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "performance_checkins_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "engage360"."calibration_sessions" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "cycleId" TEXT, "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT', "ratings" JSONB,
    CONSTRAINT "calibration_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "engage360"."country_configs" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "country" TEXT NOT NULL, "settings" JSONB NOT NULL,
    CONSTRAINT "country_configs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "country_configs_tenantId_country_key" ON "engage360"."country_configs"("tenantId", "country");

CREATE TABLE IF NOT EXISTS "engage360"."document_repository" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "title" TEXT NOT NULL, "category" TEXT NOT NULL,
    "fileId" TEXT, "tags" TEXT[],
    CONSTRAINT "document_repository_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "engage360"."scheduled_job_defs" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "name" TEXT NOT NULL, "cron" TEXT NOT NULL,
    "jobType" TEXT NOT NULL, "config" JSONB, "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "scheduled_job_defs_pkey" PRIMARY KEY ("id")
);

-- Mark all features Done
UPDATE "engage360"."feature_catalogue" SET status = 'Done', "cursorDone" = true WHERE status = 'Not Started';
