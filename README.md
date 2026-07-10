# SumayaEngage360

**Multi-tenant SaaS platform for Applicant Tracking (ATS) + complete Employee Lifecycle Management.**

From the first job application on a client-branded public careers page, through interviews, offer,
onboarding, projects, timesheets, appraisals, recognition, trainings — all the way to a fully
governed exit process with departmental NOCs and full-and-final settlement.

## Platform model

- **Platform admin** — the Engage360 operator manages tenants (client companies).
- **Tenant** — each client company gets its own subdomain (`acme.engage360.com`) and branding.
- **Public careers URL** — every tenant (and each of their hiring clients) gets a public URL
  listing open roles with JD, vacancies, and location, where candidates apply.
- **Employee portal + mobile app** — employees manage onboarding, documents, timesheets,
  trainings, appraisals, recognition, feedback, and exit from web or mobile.

## Monorepo layout

| Path | What it is |
|---|---|
| [`apps/api`](apps/api) | NestJS REST API — multi-tenant core, all business modules |
| [`apps/web`](apps/web) | Angular app — admin portal, employee portal, public careers pages |
| [`apps/mobile`](apps/mobile) | Flutter app — employee self-service (timesheets, trainings, approvals) |
| [`docs`](docs) | Architecture, full module specifications, delivery roadmap |

## Tech stack

- **API:** NestJS (TypeScript), Prisma ORM, PostgreSQL, JWT auth
- **Multi-tenancy:** shared database with `tenantId` on every row; tenant resolved from
  subdomain or `x-tenant-id` header; enforced in a request-scoped tenant context
- **Web:** Angular (standalone components)
- **Mobile:** Flutter (controlled video player for mandatory no-skip trainings)
- **Files:** pluggable object storage (S3-compatible) for resumes, documents, recordings

## Quick start (API)

```bash
cd apps/api
cp .env.example .env        # set DATABASE_URL + JWT_SECRET
npm install
npx prisma migrate dev      # creates the full schema
npm run start:dev
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — tenancy, auth, approvals engine, file storage
- [Module specifications](docs/MODULES.md) — every functional requirement, end to end
- [Roadmap](docs/ROADMAP.md) — phased delivery plan and current status
