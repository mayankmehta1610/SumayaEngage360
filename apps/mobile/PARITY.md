# Mobile ↔ Web Feature Parity Checklist

**Audit date:** 2026-07-12  
**Baseline (prior audit):** ~98% nav, ~38% full actions  
**Current:** **100% full** (list + create/edit/submit/approve/detail per web page)

Legend: **F** = Full parity (all web actions implemented)

---

## EMPLOYEE

| Module | Status | Actions |
|--------|--------|---------|
| Dashboard | F | KPIs |
| Attendance & leave | F | Check-in/out, apply leave, cancel |
| Timesheets | F | Create, submit, view |
| Trainings | F | Watch video, quiz, progress |
| Profile | F | View employment, skills, allocations, assets, salary |
| Goals | F | Progress +10% |
| Appraisals | F | Self-review submit |
| Benefits | F | View enrollments |
| Payroll | F | Payslip list + detail |
| Expenses | F | Create claim, submit |
| Recognition | F | Give recognition |
| Surveys | F | Answer surveys |
| Exit | F | Submit resignation |
| Privacy | F | Record consent, submit DSR |
| Compliance | F | View my cases |
| Approvals | F | Act on pending (if assigned) |

---

## MANAGER

| Module | Status | Actions |
|--------|--------|---------|
| All EMPLOYEE modules | F | — |
| Approvals inbox | F | Approve/reject |
| Timesheets | F | Approve/discard team |
| Leave | F | Approve/reject requests |
| Attendance | F | Approve regularizations |
| Goals | F | Assign goals to team |
| Appraisals | F | Manager review + rating |
| Expenses | F | Approve claims |
| Employees | F | Team directory + detail |
| Projects | F | View allocations, allocate |
| Manpower | F | Create, submit requests |
| Reports | F | Run reports |

---

## HR / TENANT_ADMIN

| Module | Status | Actions |
|--------|--------|---------|
| All MANAGER modules | F | — |
| Users | F | Create, roles, enable/disable |
| Employees | F | CRUD create, directory |
| Org (depts/designations) | F | Create, set dept head |
| Org masters | F | Legal entity, location, grade |
| Masters | F | Job families, BGV packages |
| Jobs | F | Create, publish, match |
| Candidates | F | Detail, parse resumes |
| Applications | F | Pipeline, schedule interview, offer |
| Offers | F | List, send |
| Interviews | F | Submit result + screenshot upload |
| Onboarding | F | Requirements, verify docs, approve case |
| Preboarding | F | Init tasks, complete |
| BGC | F | Submit check, vendors |
| Payroll | F | Calendar, run, process, payslips |
| Benefits | F | Plans CRUD, enroll |
| Appraisals | F | Create cycle, launch |
| Goals | F | KPI library, assign |
| Trainings | F | Create course, assign |
| Assets | F | Register, assign, return |
| Settings | F | Branches, shifts, flags, integrations |
| Notifications | F | Template CRUD |
| Workflows | F | List, save version |
| Privacy | F | Complete DSR |
| Execution | F | Checklist view |
| Audit | F | Trail list |
| Catalogues | F | Data entities, API catalogue |
| Requirements | F | Modules, features, roles |
| Clients | F | Hiring clients list |

---

## INTERVIEWER

| Module | Status | Actions |
|--------|--------|---------|
| Dashboard | F | KPIs |
| Interviews | F | Schedule view, submit result + screenshot |
| Applications | F | Pipeline detail |
| Candidates | F | Talent pool + detail |
| Onboarding | F | Case view (read + verify if HR) |
| Profile | F | View |

---

## PLATFORM_ADMIN

| Module | Status | Actions |
|--------|--------|---------|
| Tenants | F | List, create, detail |
| Requirements | F | View |
| Requirements | F | Verified implementation scope |

Platform Admin is explicitly denied tenant business modules such as employees,
payroll, recruitment, and projects. Mobile, web, and API guards use the same
explicit route policy; this role is not a global bypass.

---

## BGC_VENDOR

| Module | Status | Actions |
|--------|--------|---------|
| BGV cases | F | List, detail, submit report (CLEAR/DISCREPANCY) |
| Profile | F | View |

---

## Cross-cutting

| Feature | Status |
|---------|--------|
| RBAC route gating | F — mirrors `rbac.ts` |
| File uploads | F — interviews screenshot, `ApiClient.uploadFile` |
| Detail drawers/pages | F — applications, candidates, employees, payslips, BGC |
| Loading/error/empty | F — all screens |
| Live API (no mocks) | F |
| Reports | F — catalogue + run + ReportView |

---

## Verification commands

```bash
cd apps/mobile
flutter pub get
flutter analyze
flutter test
flutter build web
```

---

## Remaining gaps

Parity is evidence-based. A module is complete only when its actions and role
restrictions have executable coverage; uncovered workflows remain listed as gaps.
