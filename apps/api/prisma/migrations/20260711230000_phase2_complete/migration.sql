-- Phase 2 completion: payroll, benefits, expenses, goals, preboarding, manpower, projects

CREATE TABLE "engage360"."employee_personal_data" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "employeeId" TEXT NOT NULL,
    "emergencyName" TEXT, "emergencyPhone" TEXT, "emergencyRelation" TEXT,
    "bankName" TEXT, "bankAccountNo" TEXT, "bankIfsc" TEXT, "pan" TEXT, "aadhaarLast4" TEXT,
    "address" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "employee_personal_data_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "employee_personal_data_employeeId_key" ON "engage360"."employee_personal_data"("employeeId");

CREATE TABLE "engage360"."onboarding_tasks" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "employeeId" TEXT NOT NULL,
    "taskType" TEXT NOT NULL, "title" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING',
    "assigneeId" TEXT, "dueDate" TIMESTAMP(3), "completedAt" TIMESTAMP(3), "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "onboarding_tasks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "onboarding_tasks_tenantId_employeeId_idx" ON "engage360"."onboarding_tasks"("tenantId", "employeeId");

CREATE TABLE "engage360"."manpower_requests" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "departmentId" TEXT, "title" TEXT NOT NULL,
    "headcount" INTEGER NOT NULL, "budget" DECIMAL(65,30), "justification" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT', "requestedBy" TEXT NOT NULL, "approvedBy" TEXT,
    "jobId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "manpower_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "manpower_requests_tenantId_status_idx" ON "engage360"."manpower_requests"("tenantId", "status");

CREATE TABLE "engage360"."salary_component_masters" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL,
    "type" TEXT NOT NULL, "isStatutory" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "salary_component_masters_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "salary_component_masters_tenantId_code_key" ON "engage360"."salary_component_masters"("tenantId", "code");

CREATE TABLE "engage360"."payroll_calendars" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "name" TEXT NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'MONTHLY', "payDay" INTEGER NOT NULL DEFAULT 28,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "payroll_calendars_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "payroll_calendars_tenantId_name_key" ON "engage360"."payroll_calendars"("tenantId", "name");

CREATE TABLE "engage360"."payroll_runs" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "calendarId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL, "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT', "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payroll_runs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "payroll_runs_tenantId_status_idx" ON "engage360"."payroll_runs"("tenantId", "status");
ALTER TABLE "engage360"."payroll_runs" ADD CONSTRAINT "payroll_runs_calendarId_fkey"
    FOREIGN KEY ("calendarId") REFERENCES "engage360"."payroll_calendars"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "engage360"."payslips" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "payrollRunId" TEXT NOT NULL, "employeeId" TEXT NOT NULL,
    "grossPay" DECIMAL(65,30) NOT NULL, "netPay" DECIMAL(65,30) NOT NULL, "components" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payslips_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "payslips_payrollRunId_employeeId_key" ON "engage360"."payslips"("payrollRunId", "employeeId");
ALTER TABLE "engage360"."payslips" ADD CONSTRAINT "payslips_payrollRunId_fkey"
    FOREIGN KEY ("payrollRunId") REFERENCES "engage360"."payroll_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "engage360"."payslips" ADD CONSTRAINT "payslips_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "engage360"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "engage360"."benefit_plans" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL,
    "description" TEXT, "category" TEXT NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "benefit_plans_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "benefit_plans_tenantId_code_key" ON "engage360"."benefit_plans"("tenantId", "code");

CREATE TABLE "engage360"."benefit_enrollments" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "planId" TEXT NOT NULL, "employeeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE', "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "benefit_enrollments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "benefit_enrollments_planId_employeeId_key" ON "engage360"."benefit_enrollments"("planId", "employeeId");
ALTER TABLE "engage360"."benefit_enrollments" ADD CONSTRAINT "benefit_enrollments_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "engage360"."benefit_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "engage360"."benefit_enrollments" ADD CONSTRAINT "benefit_enrollments_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "engage360"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "engage360"."expense_claims" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "employeeId" TEXT NOT NULL, "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT', "totalAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "submittedAt" TIMESTAMP(3), "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "expense_claims_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "expense_claims_tenantId_employeeId_status_idx" ON "engage360"."expense_claims"("tenantId", "employeeId", "status");
ALTER TABLE "engage360"."expense_claims" ADD CONSTRAINT "expense_claims_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "engage360"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "engage360"."expense_line_items" (
    "id" TEXT NOT NULL, "claimId" TEXT NOT NULL, "date" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL, "amount" DECIMAL(65,30) NOT NULL, "description" TEXT, "receiptFileId" TEXT,
    CONSTRAINT "expense_line_items_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "engage360"."expense_line_items" ADD CONSTRAINT "expense_line_items_claimId_fkey"
    FOREIGN KEY ("claimId") REFERENCES "engage360"."expense_claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "engage360"."goal_library" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "title" TEXT NOT NULL, "category" TEXT, "kpis" JSONB,
    CONSTRAINT "goal_library_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "engage360"."employee_goals" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "employeeId" TEXT NOT NULL, "cycleId" TEXT,
    "title" TEXT NOT NULL, "target" TEXT, "progress" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE', "dueDate" TIMESTAMP(3),
    CONSTRAINT "employee_goals_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "employee_goals_tenantId_employeeId_idx" ON "engage360"."employee_goals"("tenantId", "employeeId");
ALTER TABLE "engage360"."employee_goals" ADD CONSTRAINT "employee_goals_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "engage360"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "engage360"."kpi_library" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "unit" TEXT,
    CONSTRAINT "kpi_library_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "kpi_library_tenantId_code_key" ON "engage360"."kpi_library"("tenantId", "code");

CREATE TABLE "engage360"."competency_library" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "level" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "competency_library_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "competency_library_tenantId_code_key" ON "engage360"."competency_library"("tenantId", "code");

CREATE TABLE "engage360"."project_contracts" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "projectId" TEXT NOT NULL, "clientRef" TEXT,
    "value" DECIMAL(65,30), "startDate" TIMESTAMP(3) NOT NULL, "endDate" TIMESTAMP(3), "terms" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "project_contracts_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "engage360"."project_contracts" ADD CONSTRAINT "project_contracts_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "engage360"."projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "engage360"."rate_cards" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "projectId" TEXT, "role" TEXT NOT NULL,
    "hourlyRate" DECIMAL(65,30) NOT NULL, "currency" TEXT NOT NULL DEFAULT 'INR', "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "rate_cards_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "rate_cards_tenantId_projectId_idx" ON "engage360"."rate_cards"("tenantId", "projectId");

-- Default salary components for new tenants (seeded per-tenant on first payroll access)
