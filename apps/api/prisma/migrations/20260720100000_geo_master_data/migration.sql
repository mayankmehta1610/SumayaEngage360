-- Geographic master data (global country → state → city) plus structured
-- location columns on jobs, candidates and employees.

CREATE TABLE "geo_countries" (
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "geo_countries_pkey" PRIMARY KEY ("code")
);

CREATE TABLE "geo_states" (
  "id" TEXT NOT NULL,
  "countryCode" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'STATE',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "geo_states_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "geo_states_countryCode_fkey" FOREIGN KEY ("countryCode")
    REFERENCES "geo_countries"("code") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "geo_states_countryCode_code_key" ON "geo_states"("countryCode", "code");
CREATE INDEX "geo_states_countryCode_name_idx" ON "geo_states"("countryCode", "name");

CREATE TABLE "geo_cities" (
  "id" TEXT NOT NULL,
  "stateId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isMajor" BOOLEAN NOT NULL DEFAULT false,
  "addedByTenantId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "geo_cities_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "geo_cities_stateId_fkey" FOREIGN KEY ("stateId")
    REFERENCES "geo_states"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "geo_cities_stateId_name_key" ON "geo_cities"("stateId", "name");
CREATE INDEX "geo_cities_name_idx" ON "geo_cities"("name");

-- Structured location columns (legacy display strings retained and synced).
ALTER TABLE "jobs" ADD COLUMN "countryCode" TEXT;
ALTER TABLE "jobs" ADD COLUMN "stateId" TEXT;
ALTER TABLE "jobs" ADD COLUMN "cityId" TEXT;
ALTER TABLE "jobs" ADD COLUMN "workMode" TEXT NOT NULL DEFAULT 'ONSITE';

ALTER TABLE "candidates" ADD COLUMN "countryCode" TEXT;
ALTER TABLE "candidates" ADD COLUMN "stateId" TEXT;
ALTER TABLE "candidates" ADD COLUMN "cityId" TEXT;
ALTER TABLE "candidates" ADD COLUMN "currentLocation" TEXT;

ALTER TABLE "employees" ADD COLUMN "countryCode" TEXT;
ALTER TABLE "employees" ADD COLUMN "stateId" TEXT;
ALTER TABLE "employees" ADD COLUMN "cityId" TEXT;
