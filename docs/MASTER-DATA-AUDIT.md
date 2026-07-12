# Master Data & Dropdown Audit

**Date:** 2026-07-12

## Summary

| Category | Before | After |
|----------|--------|-------|
| Hardcoded business dropdowns | 3 | **0** |
| Enum/status filters (OK hardcoded) | ~15 | unchanged |
| Admin UI gaps for API masters | 8 | **0** |

---

## Fixes applied

### Employment types (jobs create form)

| Location | Was | Now |
|----------|-----|-----|
| `apps/web/src/app/pages/jobs.component.ts` | Hardcoded FULL_TIME/PART_TIME/CONTRACT | `GET /org-masters/employment-types` |
| `apps/mobile/lib/screens/ats/jobs_screen.dart` | Not sent / no dropdown | `GET /org-masters/employment-types` |
| `apps/api/.../org-masters.service.ts` | Empty on new tenant | `ensureDefaultEmploymentTypes()` seeds on first list |

### Recognition badges

| Location | Was | Now |
|----------|-----|-----|
| `apps/web/.../recognition.component.ts` | Hardcoded array | `GET /recognition-badges` |
| `apps/mobile/.../composite_screens.dart` | Hardcoded 3 badges | `GET /recognition-badges` |
| API | None | `GET/POST /recognition-badges` via `tenant_config_items` |

### Country (branch create)

| Location | Was | Now |
|----------|-----|-----|
| `apps/web/.../settings.component.ts` | Free-text default `IN` | Select from `GET /masters/country-configs` |

### Admin UI coverage added

| Master | API | Web admin | Mobile admin |
|--------|-----|-----------|--------------|
| Business units | `/org-masters/business-units` | org-masters page | Org masters tab |
| Cost centers | `/org-masters/cost-centers` | org-masters page | Org masters tab |
| Employment types | `/org-masters/employment-types` | org-masters page | Org masters tab |
| Positions | `/masters/positions` | masters page | — |
| Rating scales | `/masters/rating-scales` | masters page | — |
| Country configs | `/masters/country-configs` | masters page | — |
| Salary components | `/payroll/components` | masters page | — |
| Recognition badges | `/recognition-badges` | masters page | — |

Already covered before audit: departments, designations, legal entities, locations, grades, job families, BGV packages, leave types (leave page HR section), shifts, branches, notification templates, workflows, benefit plans.

---

## Acceptable hardcoded enums (not master data)

These are **status/type enums** defined in API contracts, not tenant-configurable masters:

- Employee status filter (ACTIVE, ONBOARDING, ON_NOTICE, EXITED)
- Job status filter (DRAFT, PUBLISHED, ON_HOLD, CLOSED)
- Approval resolver types (REPORTING_MANAGER, DEPARTMENT_HEAD, …)
- DSR request types (ACCESS, ERASURE, …)
- Compliance case types (POSH, WHISTLEBLOWER, …)
- Interview result (PASSED, FAILED, NO_SHOW)
- BGV result (CLEAR, DISCREPANCY, FAILED)
- Feedback types (PEER, MANAGER_TO_EMPLOYEE, …)
- Notification channels (EMAIL, SMS, WHATSAPP)
- Timesheet entry type (CLIENT, INTERNAL)
- Appraisal cycle frequency (QUARTERLY, …)
- Application interview mode (TEAMS, ZOOM, IN_PERSON)

---

## Dropdown source reference

| Form field | Endpoint |
|------------|----------|
| Department | `/departments` |
| Designation | `/designations` |
| Employee picker | `/employees` or `/employees/directory` |
| Hiring client | `/hiring-clients` |
| Employment type | `/org-masters/employment-types` |
| Leave type | `/leave/types` |
| Project | `/projects` |
| Payroll calendar | `/payroll/calendars` |
| BGV package | `/masters/bgv-packages` |
| Recognition badge | `/recognition-badges` |
| Country | `/masters/country-configs` |
| Rating scale | `/masters/rating-scales` |
