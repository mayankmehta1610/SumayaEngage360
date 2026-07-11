-- Report catalogue (08_Reports_KPIs) + audit_logs (05_NFR NFR-009)

CREATE TABLE "engage360"."report_definitions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "filters" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'Must',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "report_definitions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "report_definitions_code_key" ON "engage360"."report_definitions"("code");

CREATE TABLE "engage360"."audit_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_tenantId_createdAt_idx" ON "engage360"."audit_logs"("tenantId", "createdAt");
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "engage360"."audit_logs"("entityType", "entityId");

INSERT INTO "engage360"."report_definitions" ("id", "code", "name", "audience", "filters", "priority") VALUES
('rpt001', 'RPT-001', 'Executive Dashboard', 'Leadership / HR / Managers / Authorized users', 'Tenant, branch, legal entity, department, manager, project, date and status', 'Must'),
('rpt002', 'RPT-002', 'Recruitment Funnel', 'Leadership / HR / Managers / Authorized users', 'Tenant, branch, legal entity, department, manager, project, date and status', 'Must'),
('rpt003', 'RPT-003', 'Stage Aging', 'Leadership / HR / Managers / Authorized users', 'Tenant, branch, legal entity, department, manager, project, date and status', 'Must'),
('rpt004', 'RPT-004', 'Source Effectiveness', 'Leadership / HR / Managers / Authorized users', 'Tenant, branch, legal entity, department, manager, project, date and status', 'Must'),
('rpt005', 'RPT-005', 'Offer to Join', 'Leadership / HR / Managers / Authorized users', 'Tenant, branch, legal entity, department, manager, project, date and status', 'Must'),
('rpt006', 'RPT-006', 'Onboarding Completion', 'Leadership / HR / Managers / Authorized users', 'Tenant, branch, legal entity, department, manager, project, date and status', 'Must'),
('rpt007', 'RPT-007', 'Headcount', 'Leadership / HR / Managers / Authorized users', 'Tenant, branch, legal entity, department, manager, project, date and status', 'Must'),
('rpt008', 'RPT-008', 'Movement', 'Leadership / HR / Managers / Authorized users', 'Tenant, branch, legal entity, department, manager, project, date and status', 'Must'),
('rpt009', 'RPT-009', 'Attrition', 'Leadership / HR / Managers / Authorized users', 'Tenant, branch, legal entity, department, manager, project, date and status', 'Must'),
('rpt010', 'RPT-010', 'Attendance Exceptions', 'Leadership / HR / Managers / Authorized users', 'Tenant, branch, legal entity, department, manager, project, date and status', 'Must'),
('rpt011', 'RPT-011', 'Leave Balance', 'Leadership / HR / Managers / Authorized users', 'Tenant, branch, legal entity, department, manager, project, date and status', 'Must'),
('rpt012', 'RPT-012', 'Timesheet Compliance', 'Leadership / HR / Managers / Authorized users', 'Tenant, branch, legal entity, department, manager, project, date and status', 'Must'),
('rpt013', 'RPT-013', 'Utilization', 'Leadership / HR / Managers / Authorized users', 'Tenant, branch, legal entity, department, manager, project, date and status', 'Must'),
('rpt014', 'RPT-014', 'Bench', 'Leadership / HR / Managers / Authorized users', 'Tenant, branch, legal entity, department, manager, project, date and status', 'Must'),
('rpt015', 'RPT-015', 'Payroll Reconciliation', 'Leadership / HR / Managers / Authorized users', 'Tenant, branch, legal entity, department, manager, project, date and status', 'Must'),
('rpt016', 'RPT-016', 'Compensation', 'Leadership / HR / Managers / Authorized users', 'Tenant, branch, legal entity, department, manager, project, date and status', 'Should'),
('rpt017', 'RPT-017', 'Performance Distribution', 'Leadership / HR / Managers / Authorized users', 'Tenant, branch, legal entity, department, manager, project, date and status', 'Should'),
('rpt018', 'RPT-018', 'Goal Compliance', 'Leadership / HR / Managers / Authorized users', 'Tenant, branch, legal entity, department, manager, project, date and status', 'Should'),
('rpt019', 'RPT-019', 'Training Compliance', 'Leadership / HR / Managers / Authorized users', 'Tenant, branch, legal entity, department, manager, project, date and status', 'Should'),
('rpt020', 'RPT-020', 'Engagement', 'Leadership / HR / Managers / Authorized users', 'Tenant, branch, legal entity, department, manager, project, date and status', 'Should'),
('rpt021', 'RPT-021', 'Recognition', 'Leadership / HR / Managers / Authorized users', 'Tenant, branch, legal entity, department, manager, project, date and status', 'Should'),
('rpt022', 'RPT-022', 'Asset Recovery', 'Leadership / HR / Managers / Authorized users', 'Tenant, branch, legal entity, department, manager, project, date and status', 'Should'),
('rpt023', 'RPT-023', 'Policy Acceptance', 'Leadership / HR / Managers / Authorized users', 'Tenant, branch, legal entity, department, manager, project, date and status', 'Should'),
('rpt024', 'RPT-024', 'Audit Access', 'Leadership / HR / Managers / Authorized users', 'Tenant, branch, legal entity, department, manager, project, date and status', 'Should'),
('rpt025', 'RPT-025', 'Exit Clearance', 'Leadership / HR / Managers / Authorized users', 'Tenant, branch, legal entity, department, manager, project, date and status', 'Should');
