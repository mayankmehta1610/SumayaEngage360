CREATE TABLE "lifecycle_cases" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "workflowCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "currentStageKey" TEXT,
    "ownerId" TEXT,
    "ownerName" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "targetDate" TIMESTAMP(3),
    "progress" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "lifecycle_cases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lifecycle_stages" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "stageKey" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "ownerRole" TEXT,
    "ownerId" TEXT,
    "ownerName" TEXT,
    "dueDate" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "lifecycle_stages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lifecycle_tasks" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "taskCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "required" BOOLEAN NOT NULL DEFAULT true,
    "ownerRole" TEXT,
    "ownerId" TEXT,
    "ownerName" TEXT,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "evidenceNote" TEXT,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "lifecycle_tasks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lifecycle_documents" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "documentCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "assignedTo" TEXT,
    "ownerName" TEXT,
    "dueDate" TIMESTAMP(3),
    "fileId" TEXT,
    "fileName" TEXT,
    "referenceNumber" TEXT,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "rejectionReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "lifecycle_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lifecycle_activities" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "stageId" TEXT,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lifecycle_activities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "lifecycle_cases_tenantId_entityType_entityId_workflowCode_key" ON "lifecycle_cases"("tenantId", "entityType", "entityId", "workflowCode");
CREATE INDEX "lifecycle_cases_tenantId_workflowCode_status_idx" ON "lifecycle_cases"("tenantId", "workflowCode", "status");
CREATE INDEX "lifecycle_cases_tenantId_ownerId_idx" ON "lifecycle_cases"("tenantId", "ownerId");
CREATE UNIQUE INDEX "lifecycle_stages_caseId_stageKey_key" ON "lifecycle_stages"("caseId", "stageKey");
CREATE INDEX "lifecycle_stages_caseId_sequence_idx" ON "lifecycle_stages"("caseId", "sequence");
CREATE UNIQUE INDEX "lifecycle_tasks_stageId_taskCode_key" ON "lifecycle_tasks"("stageId", "taskCode");
CREATE INDEX "lifecycle_tasks_stageId_status_idx" ON "lifecycle_tasks"("stageId", "status");
CREATE UNIQUE INDEX "lifecycle_documents_stageId_documentCode_key" ON "lifecycle_documents"("stageId", "documentCode");
CREATE INDEX "lifecycle_documents_stageId_status_idx" ON "lifecycle_documents"("stageId", "status");
CREATE INDEX "lifecycle_documents_expiresAt_idx" ON "lifecycle_documents"("expiresAt");
CREATE INDEX "lifecycle_activities_caseId_createdAt_idx" ON "lifecycle_activities"("caseId", "createdAt");

ALTER TABLE "lifecycle_stages" ADD CONSTRAINT "lifecycle_stages_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "lifecycle_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lifecycle_tasks" ADD CONSTRAINT "lifecycle_tasks_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "lifecycle_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lifecycle_documents" ADD CONSTRAINT "lifecycle_documents_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "lifecycle_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lifecycle_activities" ADD CONSTRAINT "lifecycle_activities_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "lifecycle_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lifecycle_activities" ADD CONSTRAINT "lifecycle_activities_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "lifecycle_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
