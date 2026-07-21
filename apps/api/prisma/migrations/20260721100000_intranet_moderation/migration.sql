-- Intranet content moderation: per-category reviewer role and review metadata.
ALTER TABLE "intranet_categories" ADD COLUMN "reviewerRole" TEXT;

ALTER TABLE "intranet_contents" ADD COLUMN "reviewNote" TEXT;
ALTER TABLE "intranet_contents" ADD COLUMN "reviewedBy" TEXT;
ALTER TABLE "intranet_contents" ADD COLUMN "reviewedAt" TIMESTAMP(3);
