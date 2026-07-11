-- Candidate-vs-job match scores (talent pool + auto-shortlisting)
CREATE TABLE "match_scores" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "ruleScore" INTEGER,
    "aiScore" INTEGER,
    "finalScore" INTEGER NOT NULL DEFAULT 0,
    "breakdown" JSONB,
    "shortlisted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_scores_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "match_scores_jobId_candidateId_key" ON "match_scores"("jobId", "candidateId");
CREATE INDEX "match_scores_tenantId_jobId_finalScore_idx" ON "match_scores"("tenantId", "jobId", "finalScore");

ALTER TABLE "match_scores" ADD CONSTRAINT "match_scores_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "match_scores" ADD CONSTRAINT "match_scores_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
