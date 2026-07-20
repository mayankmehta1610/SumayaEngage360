-- Tenant-provisioned operating cities. Country is fixed by the tenant
-- (primary + operatingCountries, exposed in the URI), cities are provisioned
-- per tenant and scope the in-app location pickers.

CREATE TABLE "tenant_cities" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "cityId" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tenant_cities_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tenant_cities_cityId_fkey" FOREIGN KEY ("cityId")
    REFERENCES "geo_cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "tenant_cities_tenantId_cityId_key" ON "tenant_cities"("tenantId", "cityId");
CREATE INDEX "tenant_cities_tenantId_isActive_idx" ON "tenant_cities"("tenantId", "isActive");
