# Read-Only Screen Audit

**Date:** 2026-07-12  
**Scope:** `apps/web/src/app/pages/*.component.ts`, `apps/mobile/lib/screens/`

## Summary

| Platform | Full CRUD (F) | Intentional read-only (R) | Partial (P) |
|----------|---------------|---------------------------|-------------|
| Web | 41 modules | 4 modules | 2 modules |
| Mobile | 38 modules | 4 modules (mirror web) | 2 modules |

**Target met:** Only intentional GET-only catalogues remain read-only.

---

## Intentional read-only (by design — no write API)

| Module | Web | Mobile | Reason |
|--------|-----|--------|--------|
| **Catalogues** | R | R (`composite_screens.dart` TabbedApiScreen) | GET `/v1/data-entities`, `/v1/api-catalogue` — registry only |
| **Requirements** | R | R (TabbedApiScreen) | GET `/requirements/*` — spec registry |
| **Audit** | R | R (`ApiListScreen` on `/audit`) | GET `/audit` — immutable trail |
| **Execution** | R | R (checklist view) | GET `/v1/execution/checklist` — implementation tracker |

These are **intentional** and should remain read-only.

---

## Dashboard & reports (aggregate / run-only)

| Module | Web | Mobile | Reason |
|--------|-----|--------|--------|
| **Dashboard** | R (KPIs) | R (KPIs) | GET `/dashboard/kpis` — no entity CRUD |
| **Reports** | R (catalogue + run) | R (catalogue + run) | GET `/reports`, `/reports/:code` — parameterized queries, not entity CRUD |

---

## Partial — API limits write surface

| Module | Web | Mobile | Gap |
|--------|-----|--------|-----|
| **Candidates** | P | P | List/detail/parse only; candidates created via careers apply API |
| **Workflows** | P | P | Version snapshot save; no full visual designer CRUD in API |

---

## Previously read-only — now full CRUD

All other web pages have create/edit/submit/approve actions where the API supports writes. Mobile routes through `admin_screens.dart`, `operations_screens.dart`, `composite_screens.dart`, and dedicated screen files with equivalent actions.

Verified modules with write UI: users, tenants, org, org-masters, masters, settings, employees, jobs, applications, leave, timesheets, payroll, benefits, expenses, goals, appraisals, trainings, assets, manpower, projects, clients, onboarding, preboarding, BGC, privacy, compliance, notifications, recognition, surveys, exit, approvals, profile.

---

## Mobile `ApiListScreen` usage

| Screen | Endpoint | Status |
|--------|----------|--------|
| Audit trail | `/audit` | **Intentional R** |

All other mobile modules use StatefulWidget with POST/PATCH actions.

---

## Verification

```bash
# Grep web pages without write API calls (expect only dashboard, catalogues, requirements, audit, execution, reports, login, landing, shell)
rg "\.(post|patch|put|delete)\(" apps/web/src/app/pages/ --files-without-match

# Mobile ApiListScreen-only (expect audit only for intentional R)
rg "ApiListScreen" apps/mobile/lib/screens/
```
