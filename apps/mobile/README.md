# SumayaEngage360 Mobile (Flutter)

Enterprise mobile client for **every role** — wired to the live NestJS API with RBAC-gated navigation matching the web app (`apps/web/src/app/core/rbac.ts`).

## Architecture

```
lib/
  main.dart
  core/           api_client.dart, auth_service.dart, rbac.dart, theme.dart
  screens/        auth, shell, dashboard, attendance, timesheets, trainings, ats/…
  widgets/        common.dart, api_list_screen.dart, report_view.dart, …
```

- **Drawer** — full module list grouped by domain (Platform, ATS, Workforce, …)
- **Bottom nav** — role-specific quick actions (ESS for employees, Inbox for managers/HR)
- **ApiClient** — JWT + `x-tenant-id` on every request; session in `shared_preferences`

## Prerequisites (Windows — verified 2026-07-12)

1. **Flutter SDK** at `C:\flutter` (stable channel):

```powershell
git clone --depth 1 --branch stable https://github.com/flutter/flutter.git C:\flutter
$env:Path = "C:\flutter\bin;" + $env:Path
flutter --version
# Flutter 3.44.6 • Dart 3.12.2
flutter doctor
```

2. **PATH** (persistent): add `C:\flutter\bin` to your user PATH.

3. **Windows desktop builds** require **Developer Mode** (Settings → System → For developers) for plugin symlinks. Web builds do not.

## API configuration

| Define | Purpose | Default |
|--------|---------|---------|
| `API_BASE` | API root URL | Android emulator: `http://10.0.2.2:3000/api` · iOS sim: `http://localhost:3000/api` |
| `API_URL` | Alias for `API_BASE` (legacy) | same |
| `TENANT` | Pre-fill tenant code | `sumaya` on login screen |

Production (Render):

```powershell
cd apps/mobile
flutter run --dart-define=API_BASE=https://engage360-api-qhnr.onrender.com/api --dart-define=TENANT=sumaya
```

Local API (from repo root, port 3000):

```powershell
# Android emulator
flutter run --dart-define=API_BASE=http://10.0.2.2:3000/api --dart-define=TENANT=sumaya

# iOS simulator / desktop / web
flutter run --dart-define=API_BASE=http://localhost:3000/api --dart-define=TENANT=sumaya
```

## Verified run commands

```powershell
$env:Path = "C:\flutter\bin;" + $env:Path
cd apps/mobile

flutter pub get
flutter analyze          # No issues found
flutter test             # 1/1 passed

# First-time platform folders (already generated in repo):
flutter create . --org com.engage360 --project-name engage360_mobile --platforms=windows,web

# Build web (works without Developer Mode):
flutter build web --dart-define=API_BASE=https://engage360-api-qhnr.onrender.com/api --dart-define=TENANT=sumaya
# Output: apps/mobile/build/web/

# Build Windows (requires Developer Mode):
flutter build windows --dart-define=API_BASE=https://engage360-api-qhnr.onrender.com/api --dart-define=TENANT=sumaya
# Output: apps/mobile/build/windows/x64/runner/Release/engage360_mobile.exe
```

## Test credentials (tenant: `sumaya`)

| Role | Email | Password | Mobile experience |
|------|-------|----------|-------------------|
| **Tenant Admin / HR** | `owner@sumaya.com` | `Owner@12345` | Full drawer: ATS, payroll, settings, org masters, workflows, audit, … |
| **HR walkthrough** | `walk-hr@sumaya.com` | `Walk@12345` | HR modules + job create, application pipeline, offers |
| **Manager** | `walk-mgr@sumaya.com` | `Walk@12345` | Bottom nav: Home, Inbox, Attendance, Timesheets, Modules + team approvals |
| **Employee** | `walk-emp@sumaya.com` | `Walk@12345` | ESS: check-in/out, leave, timesheets, trainings, expenses, profile |
| **BGC Vendor** | `walk-bgc@sumaya.com` | `Walk@12345` | BGV cases portal with report submission |
| **Platform Admin** | (platform seed user) | — | Tenants list + all modules via drawer |

## Modules implemented (per role via RBAC)

All web routes from `ROUTE_ACCESS` have a mobile screen with pull-to-refresh and live API calls:

| Group | Modules |
|-------|---------|
| Platform | Dashboard, Reports, Settings, Catalogues, Requirements, Audit, Execution, Tenants, Users |
| ATS | Clients, Jobs (+ create), Candidates, Applications (+ detail/pipeline), Interviews, Offers (filtered list), Matching |
| Workforce | Employees, Onboarding, Preboarding, Departments, Exit, BGC admin |
| Operations | Projects, Manpower, Assets, Attendance & leave, Timesheets |
| Compensation | Payroll, Benefits, Expenses |
| Performance | Goals, Appraisals, Trainings, Recognition, Surveys |
| Workflow | Approvals inbox, Workflows, Notifications |
| Admin | Org masters, Masters, Privacy, Compliance, BGV vendor portal |
| Personal | Profile |

### Key actions by role

- **Employee** — punch in/out, apply leave, submit timesheets, training player + quizzes, expense claims (title + lines), resignation, surveys, recognition
- **Manager** — approve leave, attendance fixes, timesheets, workflow approvals; team employee list
- **HR / Admin** — all list modules, job create, application status/interview/offer actions, reports catalogue, settings, audit, BGC checks, onboarding cases
- **BGC Vendor** — view assigned cases, submit verification reports
- **Platform Admin** — tenant list (read-only mobile view)

## Design

Material 3, brand `#2F6BFF`, navy app bars / drawer (web sidebar equivalent), 16px cards, light + dark themes.

## Mobile gaps (remaining)

- **Complex admin CRUD** — most masters/settings remain list-only; deep edits stay on web
- **Expense receipt upload** — `ApiClient.uploadFile()` is implemented; API create DTO does not yet accept `receiptFileId` on lines
- **Report charts** — reports render KPI tiles and data tables, not chart widgets
- **Offline** — requires network; no sync queue
- **Walkthrough seed users** — some ESS endpoints return 404 if the user has no linked `Employee` record on Render (data seed issue, not app bug)

## No-skip training

The training player sends heartbeats every 5 s; the server credits only verified elapsed time. Back navigation is blocked during mandatory videos.
