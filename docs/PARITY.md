# Engage360 Web ↔ Mobile Parity Matrix

Last updated: 2026-07-12

## Legend

| Code | Meaning |
|------|---------|
| **F** | Full — list + create/update/submit/approve actions where the API supports them; all data from API/DB |
| **R** | Read-only by design — registry, audit, or checklist endpoints with no write API |
| **P** | Partial — write actions exist but API does not expose full CRUD for the entity |

## Summary

| Platform | Before | After | Notes |
|----------|--------|-------|-------|
| **Web** (`apps/web`) | ~85% F | **~95% F** | Registry/audit modules intentionally read-only |
| **Mobile** (`apps/mobile`) | ~38% F | **~95% F** | Wired to `admin_screens`, `operations_screens`, `composite_screens` |

**Remaining gaps (target 0 for actionable modules):** 0 thin mobile modules; 4 intentional read-only pairs (catalogues, requirements, audit, execution).

---

## Module matrix

| Module | Web | Mobile | API write endpoints |
|--------|-----|--------|---------------------|
| Dashboard | F | F | GET aggregates |
| Approvals | F | F | POST act, workflow create |
| Attendance / Leave | F | F | check-in/out, leave CRUD, regularizations |
| Timesheets | F | F | submit, approve/reject |
| Trainings | F | F | courses, assign, quizzes |
| Recognition | F | F | POST recognition, feedback |
| Surveys | F | F | create, publish, respond |
| Expenses | F | F | create, submit, approve |
| Goals | F | F | KPIs, assignments, progress |
| Appraisals | F | F | cycles, self/manager review, launch |
| Payroll | F | F | calendars, runs, process |
| Benefits | F | F | plans, enroll |
| Exit | F | F | resignation, clearance, F&F, release |
| Projects | F | F | create, allocations |
| Employees | F | F | POST create, directory/team views |
| Manpower | F | F | create, submit, approve |
| Assets | F | F | register, assign, return |
| Org (depts/designations) | F | F | POST departments, designations, set head |
| Org masters | F | F | POST legal entities, locations, grades |
| Masters | F | F | job families, BGV packages |
| Settings | F | F | branches, shifts, flags, integrations |
| Notifications | F | F | template create, deliveries list |
| Workflows | P | P | version snapshot (no full designer CRUD in API) |
| Preboarding admin | F | F | init tasks, complete |
| Privacy & DSR | F | F | consent, DSR submit, HR complete |
| Compliance | F | F | report case, investigate, resolve, retention |
| Users | F | F | create, roles, enable/disable |
| Tenants | F | F | create (platform admin) |
| Hiring clients | F | F | POST create, PATCH edit/active |
| Jobs | F | F | create, publish, match |
| Candidates | P | P | list/detail/parse (candidates from careers apply) |
| Applications | F | F | status, interviews, offers |
| Interviews | F | F | schedule view, submit result + upload |
| Offers | F | F | send |
| Matching | F | F | job matches view |
| Onboarding (admin) | F | F | requirements, verify docs, approve cases |
| BGC admin | F | F | submit checks, vendors |
| BGC vendor | F | F | report cases |
| Reports | F | F | catalogue + run |
| Profile | F | F | view/update |
| **Catalogues** | R | R | GET data-entities, api-catalogue |
| **Requirements** | R | R | GET overview, modules, features, roles |
| **Audit** | R | R | GET audit log |
| **Execution** | R | R | GET implementation checklist |
| Careers (public) | F | — | public apply |
| Onboarding portal | F | — | public token portal |

---

## Mobile screen map (post-fix)

| Route | Screen file |
|-------|-------------|
| `/users`, `/tenants`, `/org`, `/org-masters`, `/masters`, `/notifications`, `/workflows`, `/settings` | `admin_screens.dart` |
| `/manpower`, `/assets`, `/clients`, `/candidates`, `/projects`, `/onboarding`, `/bgc`, `/preboarding-admin` | `operations_screens.dart` |
| `/recognition` … `/exit`, `/employees`, `/reports`, `/catalogues`, `/requirements`, `/audit`, `/execution`, `/privacy`, `/compliance`, `/interviews`, `/matching`, `/bgc-vendor` | `composite_screens.dart` |
| `/jobs`, `/applications`, `/offers` | `screens/ats/*.dart` |
| `/dashboard`, `/leave`, `/timesheets`, `/trainings`, `/approvals`, `/profile` | dedicated screen files |

`module_screens.dart` routes all modules to the full implementations above (no `ApiListScreen`-only wrappers).

---

## Verification

| Check | Result |
|-------|--------|
| `npm run build` (apps/web) | **PASS** |
| `npm run test:e2e` (apps/api) | **PASS** — 157/157 against Render API |
| `flutter analyze` (apps/mobile) | **BLOCKED** — Flutter SDK not on PATH in CI shell |
| `flutter test` (apps/mobile) | **BLOCKED** — same |

To verify locally:

```bash
docker compose up -d
cp apps/api/.env.example apps/api/.env   # set DATABASE_URL port 15433 if using compose
cd apps/api && npx prisma migrate deploy && npm run start:dev
npm run test:e2e   # in apps/api
cd apps/web && npm run build
cd apps/mobile && flutter analyze && flutter test
```

Render credentials: `sumaya` / `owner@sumaya.com` / `Owner@12345`
