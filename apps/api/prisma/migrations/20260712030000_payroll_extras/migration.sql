-- Payroll adjustments (bonus/incentive/OT/arrears/loans/advances) + tax declarations
CREATE TYPE "AdjustmentType" AS ENUM ('BONUS', 'INCENTIVE', 'OVERTIME', 'ARREAR', 'RECOVERY', 'LOAN', 'ADVANCE');

CREATE TABLE "payroll_adjustments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "AdjustmentType" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "period" TEXT NOT NULL,
    "note" TEXT,
    "balance" DECIMAL(65,30),
    "monthlyRecover" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payroll_adjustments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "payroll_adjustments_tenantId_employeeId_period_idx" ON "payroll_adjustments"("tenantId", "employeeId", "period");

CREATE TABLE "tax_declarations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "regime" TEXT NOT NULL DEFAULT 'NEW',
    "items" JSONB NOT NULL,
    "total" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tax_declarations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tax_declarations_employeeId_fiscalYear_key" ON "tax_declarations"("employeeId", "fiscalYear");
