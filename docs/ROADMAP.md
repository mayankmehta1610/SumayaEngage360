# Delivery Roadmap

## Phase 0 — Foundation ✅ (this scaffold)
- Monorepo, docs, full domain data model (Prisma schema — every module modeled).
- NestJS API: multi-tenant context, JWT auth + RBAC, tenants module.
- ATS core: hiring clients, jobs, public careers endpoints, candidates, applications,
  interview rounds (with recording + mandatory screenshot slots), offers.
- Angular workspace scaffold; Flutter app scaffold.

## Phase 1 — ATS complete
- Interview scheduling + calendar/Teams integration; recording upload to object storage.
- Offer letter document generation (PDF) and e-acceptance flow.
- Resume LLM parsing behind the `ResumeParser` interface.
- Careers page theming per hiring client.

## Phase 2 — Onboarding & BGC
- Country-configurable document checklists; document upload + HR verification queue.
- BGC vendor portal (restricted role), case submission, report upload, employee-hidden visibility.
- Policy library + acknowledgement tracking; guided joiner wizard.
- Onboarding approval chain via the approval engine.

## Phase 3 — Core HR
- Employee master, departments/designations, org chart.
- Salary structures with components, deductions, tax calc; revision history.
- Projects + percentage allocations; manager assignment on allocation.
- Assets registry + issue/return.

## Phase 4 — Time & performance
- Internal + client timesheets with manager approve/discard.
- Customizable appraisal cycles, templates, self/appraiser/reviewer flow.
- Recognition module + feed; 360° feedback.

## Phase 5 — Trainings
- Course/playlist management, locked video player (web + mobile),
  server-verified watch progress, quizzes.

## Phase 6 — Exit
- Resignation + designation-based approvals, notice computation.
- Departmental NOC clearances with delegation.
- Release letter generation; full & final settlement.

## Phase 7 — Mobile app feature-complete, hardening
- Flutter parity for employee self-service; push notifications.
- Audit log, rate limiting, RLS, SSO (SAML/OIDC) for enterprise tenants.
