-- Sheets 5-12 completion: org masters, privacy, notifications, SSO, idempotency, exports

CREATE TABLE "engage360"."legal_entities" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'IN', "taxId" TEXT, "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "legal_entities_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "legal_entities_tenantId_code_key" ON "engage360"."legal_entities"("tenantId", "code");

CREATE TABLE "engage360"."locations" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL,
    "city" TEXT, "country" TEXT NOT NULL DEFAULT 'IN', "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "locations_tenantId_code_key" ON "engage360"."locations"("tenantId", "code");

CREATE TABLE "engage360"."business_units" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "business_units_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "business_units_tenantId_code_key" ON "engage360"."business_units"("tenantId", "code");

CREATE TABLE "engage360"."cost_centers" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cost_centers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cost_centers_tenantId_code_key" ON "engage360"."cost_centers"("tenantId", "code");

CREATE TABLE "engage360"."grades" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1, "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "grades_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "grades_tenantId_code_key" ON "engage360"."grades"("tenantId", "code");

CREATE TABLE "engage360"."employment_types" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "employment_types_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "employment_types_tenantId_code_key" ON "engage360"."employment_types"("tenantId", "code");

CREATE TABLE "engage360"."holiday_calendars" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "name" TEXT NOT NULL, "year" INTEGER NOT NULL,
    "holidays" JSONB NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "holiday_calendars_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "holiday_calendars_tenantId_name_year_key" ON "engage360"."holiday_calendars"("tenantId", "name", "year");

CREATE TABLE "engage360"."jd_library" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "title" TEXT NOT NULL, "body" TEXT NOT NULL,
    "tags" TEXT[], "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "jd_library_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "engage360"."subscription_plans" (
    "id" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "maxEmployees" INTEGER,
    "features" JSONB NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "subscription_plans_code_key" ON "engage360"."subscription_plans"("code");

CREATE TABLE "engage360"."tenant_settings" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "key" TEXT NOT NULL, "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tenant_settings_tenantId_key_key" ON "engage360"."tenant_settings"("tenantId", "key");

CREATE TYPE "engage360"."DsrType" AS ENUM ('ACCESS', 'ERASURE', 'PORTABILITY', 'RECTIFICATION');
CREATE TYPE "engage360"."DsrStatus" AS ENUM ('SUBMITTED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');

CREATE TABLE "engage360"."consent_records" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "userId" TEXT NOT NULL, "purpose" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL, "version" TEXT NOT NULL DEFAULT '1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "consent_records_tenantId_userId_idx" ON "engage360"."consent_records"("tenantId", "userId");

CREATE TABLE "engage360"."data_subject_requests" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "userId" TEXT NOT NULL,
    "type" "engage360"."DsrType" NOT NULL, "status" "engage360"."DsrStatus" NOT NULL DEFAULT 'SUBMITTED',
    "details" TEXT, "completedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "data_subject_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "data_subject_requests_tenantId_status_idx" ON "engage360"."data_subject_requests"("tenantId", "status");

CREATE TABLE "engage360"."notification_templates" (
    "id" TEXT NOT NULL, "tenantId" TEXT, "code" TEXT NOT NULL, "channel" TEXT NOT NULL,
    "subject" TEXT, "body" TEXT NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "engage360"."notification_deliveries" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "templateId" TEXT, "channel" TEXT NOT NULL,
    "recipient" TEXT NOT NULL, "payload" JSONB, "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "notification_deliveries_tenantId_status_idx" ON "engage360"."notification_deliveries"("tenantId", "status");

CREATE TABLE "engage360"."idempotency_keys" (
    "id" TEXT NOT NULL, "tenantId" TEXT, "userId" TEXT, "key" TEXT NOT NULL,
    "method" TEXT NOT NULL, "path" TEXT NOT NULL, "response" JSONB, "statusCode" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "idempotency_keys_tenantId_key_key" ON "engage360"."idempotency_keys"("tenantId", "key");

CREATE TABLE "engage360"."sso_providers" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "provider" TEXT NOT NULL,
    "issuerUrl" TEXT NOT NULL, "clientId" TEXT NOT NULL, "clientSecret" TEXT,
    "metadataUrl" TEXT, "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sso_providers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "sso_providers_tenantId_provider_key" ON "engage360"."sso_providers"("tenantId", "provider");

CREATE TABLE "engage360"."async_export_jobs" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "userId" TEXT NOT NULL, "entityType" TEXT NOT NULL,
    "filters" JSONB, "status" TEXT NOT NULL DEFAULT 'PENDING', "fileId" TEXT,
    "expiresAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "async_export_jobs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "async_export_jobs_tenantId_userId_idx" ON "engage360"."async_export_jobs"("tenantId", "userId");

INSERT INTO "engage360"."subscription_plans" ("id", "code", "name", "maxEmployees", "features") VALUES
('plan-starter', 'STARTER', 'Starter', 50, '{"ats":true,"hr":true,"reports":true}'),
('plan-growth', 'GROWTH', 'Growth', 500, '{"ats":true,"hr":true,"reports":true,"integrations":true}'),
('plan-enterprise', 'ENTERPRISE', 'Enterprise', null, '{"ats":true,"hr":true,"reports":true,"integrations":true,"sso":true}');

INSERT INTO "engage360"."notification_templates" ("id", "tenantId", "code", "channel", "subject", "body") VALUES
('tpl-offer', null, 'OFFER_SENT', 'EMAIL', 'Your offer from {{company}}', 'Dear {{name}}, your offer letter is ready.'),
('tpl-onboard', null, 'ONBOARDING_INVITE', 'EMAIL', 'Complete your onboarding', 'Welcome! Complete onboarding at {{link}}.'),
('tpl-timesheet', null, 'TIMESHEET_REMINDER', 'EMAIL', 'Timesheet reminder', 'Please submit your timesheet for {{period}}.'),
('tpl-exit', null, 'EXIT_CLEARANCE', 'EMAIL', 'Exit clearance update', 'Your exit clearance status: {{status}}.');

INSERT INTO "engage360"."execution_evidence" ("id", "featureId", "sheetRef", "step", "evidence", "status") VALUES
('ev010', NULL, '05_NFR', 'NFR-010', 'Consent + DSR APIs', 'DONE'),
('ev011', NULL, '05_NFR', 'NFR-019', 'File mime/size validation', 'DONE'),
('ev012', NULL, '05_NFR', 'NFR-024', 'Async export jobs', 'DONE'),
('ev013', NULL, '06_Data_Entities', 'ORG', 'Legal entity, location, BU, grade masters', 'DONE'),
('ev014', NULL, '09_Integrations', 'ALL', 'Adapter registry for INT-001..018', 'DONE'),
('ev015', NULL, '12_AI_Execution', '8', 'Notification templates + delivery queue', 'DONE');
