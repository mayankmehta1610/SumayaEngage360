-- Intranet publishing system, tenant branding (CMS) and audit device capture.

-- Tenant branding: uploaded logo + brand colors, editable within the tenant.
ALTER TABLE "tenants" ADD COLUMN "logoFileId" TEXT;
ALTER TABLE "tenants" ADD COLUMN "brandPrimaryColor" TEXT;
ALTER TABLE "tenants" ADD COLUMN "brandAccentColor" TEXT;
ALTER TABLE "tenants" ADD COLUMN "brandTagline" TEXT;

-- Audit trail: record the device every change came from.
ALTER TABLE "audit_logs" ADD COLUMN "userAgent" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "deviceType" TEXT;

-- Intranet enums
CREATE TYPE "IntranetContentType" AS ENUM ('ARTICLE', 'DOCUMENT', 'VIDEO', 'POSTER', 'LINK');
CREATE TYPE "IntranetContentStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "IntranetAccessLevel" AS ENUM ('COMPANY', 'DEPARTMENT', 'ROLES', 'PRIVATE');

CREATE TABLE "intranet_categories" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "departmentId" TEXT NOT NULL,
  "parentId" TEXT,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "icon" TEXT,
  "bannerFileId" TEXT,
  "accessLevel" "IntranetAccessLevel" NOT NULL DEFAULT 'COMPANY',
  "allowedRoles" JSONB,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "intranet_categories_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "intranet_categories_parentId_fkey" FOREIGN KEY ("parentId")
    REFERENCES "intranet_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "intranet_categories_tenantId_departmentId_parentId_idx"
  ON "intranet_categories"("tenantId", "departmentId", "parentId");

CREATE TABLE "intranet_contents" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "departmentId" TEXT NOT NULL,
  "categoryId" TEXT,
  "type" "IntranetContentType" NOT NULL DEFAULT 'ARTICLE',
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "body" TEXT,
  "fileId" TEXT,
  "coverFileId" TEXT,
  "externalUrl" TEXT,
  "status" "IntranetContentStatus" NOT NULL DEFAULT 'DRAFT',
  "accessLevel" "IntranetAccessLevel" NOT NULL DEFAULT 'COMPANY',
  "allowedRoles" JSONB,
  "downloadable" BOOLEAN NOT NULL DEFAULT true,
  "pinned" BOOLEAN NOT NULL DEFAULT false,
  "tags" TEXT[],
  "publishedAt" TIMESTAMP(3),
  "publishedBy" TEXT,
  "expiresAt" TIMESTAMP(3),
  "viewCount" INTEGER NOT NULL DEFAULT 0,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "intranet_contents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "intranet_contents_categoryId_fkey" FOREIGN KEY ("categoryId")
    REFERENCES "intranet_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "intranet_contents_tenantId_status_pinned_idx"
  ON "intranet_contents"("tenantId", "status", "pinned");
CREATE INDEX "intranet_contents_tenantId_departmentId_categoryId_idx"
  ON "intranet_contents"("tenantId", "departmentId", "categoryId");

CREATE TABLE "intranet_banners" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "departmentId" TEXT,
  "categoryId" TEXT,
  "title" TEXT NOT NULL,
  "subtitle" TEXT,
  "imageFileId" TEXT,
  "linkUrl" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "intranet_banners_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "intranet_banners_tenantId_departmentId_categoryId_isActive_idx"
  ON "intranet_banners"("tenantId", "departmentId", "categoryId", "isActive");
