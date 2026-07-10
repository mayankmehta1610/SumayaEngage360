# Architecture

## High level

```
                        ┌──────────────────────────────────────────┐
  candidate ──────────▶ │  Public careers pages (Angular, SSR-able) │
  (no login)            └──────────────┬───────────────────────────┘
                                       │
  tenant admin / HR ──▶ Angular admin portal ──┐
  employee ───────────▶ Angular employee portal│──▶  NestJS API ──▶ PostgreSQL
  employee (mobile) ──▶ Flutter app ───────────┘        │
  BGC vendor ─────────▶ vendor portal (restricted) ─────┘
                                                        │
                                              S3-compatible object storage
                                       (resumes, docs, recordings, screenshots, letters)
```

## Multi-tenancy

- **Shared database, `tenantId` discriminator column** on every tenant-owned table.
- Tenant resolution middleware: subdomain (`acme.engage360.com`) in production,
  `x-tenant-id` header in development — stored in a request-scoped `TenantContext`.
- Services read the tenant from context; repositories always filter by it.
- Postgres row-level security can be layered on later without changing the app model.
- Candidate-facing public endpoints are tenant-scoped but unauthenticated
  (they resolve tenant + hiring client from the URL).

## Identity & access

- JWT bearer auth (`@nestjs/jwt`), bcrypt password hashing.
- Roles: `PLATFORM_ADMIN`, `TENANT_ADMIN`, `HR`, `MANAGER`, `EMPLOYEE`, `INTERVIEWER`,
  `BGC_VENDOR`, `DEPARTMENT_HEAD`. A user can hold multiple roles.
- Platform admins have `tenantId = null` and may act across tenants.
- BGC vendors authenticate like users but are locked to `BackgroundCheck` cases
  assigned to their vendor org.

## Approval engine

One generic engine used by every module that needs sign-off:

- `ApprovalWorkflow` — per tenant, per entity type (`ONBOARDING`, `RESIGNATION`,
  `TIMESHEET`, `EXIT_CLEARANCE`, ...), ordered steps.
- `ApprovalStep` — resolves approvers by **designation**, department-head role, or named user.
- `ApprovalRequest` — an instance bound to a target entity id; advances step by step.
- `ApprovalAction` — approve / reject / delegate, with actor, timestamp, comment.

## Trainings — no-skip enforcement

- Client players (web + Flutter) hide seek/close controls for mandatory videos.
- The **server is the source of truth**: the client posts watch-progress heartbeats
  (`positionSeconds`, monotonic); the API rejects jumps beyond a tolerance and only
  marks a video complete when accumulated verified watch time ≥ video duration.

## Files

`FileObject` rows point at object-storage keys. Local disk driver for development,
S3-compatible driver for production. Signed URLs for candidate/vendor uploads.

## Resume parsing (planned)

`ResumeParser` is an interface. V1: manual profile entry + raw CV stored.
V2: LLM-based parser fills the candidate profile from the uploaded CV
(provider/endpoint configurable per deployment).
