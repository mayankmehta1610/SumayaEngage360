# SumayaEngage360 — URLs & Logins (Permanent Reference)

*Compiled from `apps/mobile/README.md`, `docs/USER-MANUAL.md`, `docs/PARITY.md`, `render.yaml`, `apps/web/e2e/*`, and `apps/api/test/e2e.mjs`. Last updated: 2026-07-12.*

---

## Quick copy-paste cheat sheet

### Render (production demo)

```
Web:      https://engage360-web.onrender.com/login
API:      https://engage360-api-qhnr.onrender.com/api
Health:   https://engage360-api-qhnr.onrender.com/api/health
Careers:  https://engage360-web.onrender.com/careers/sumaya/sumaya-internal

Tenant:   sumaya
Owner:    owner@sumaya.com / Owner@12345          (Tenant Admin)
HR:       walk-hr@sumaya.com / Walk@12345
Manager:  walk-mgr@sumaya.com / Walk@12345
Employee: walk-emp@sumaya.com / Walk@12345
BGC:      walk-bgc@sumaya.com / Walk@12345
Platform: (tenant empty) admin@engage360.com / Admin@12345   [if registered on DB]
```

### Local dev (after bootstrap below)

```
Web:      http://127.0.0.1:4200/login
API:      http://localhost:3000/api
Health:   http://localhost:3000/api/health

Platform: (tenant empty) admin@engage360.com / Admin@12345   [first register on fresh DB]
          OR run Playwright ui.spec.ts → ephemeral ui-a-*/ui-b-* tenants, password Flow@12345
```

### Mobile (Chrome → Render API)

```powershell
cd apps/mobile
flutter run -d chrome --dart-define=API_BASE=https://engage360-api-qhnr.onrender.com/api --dart-define=TENANT=sumaya
# Login: owner@sumaya.com / Owner@12345
```

---

## 1. Production Render URLs

| Surface | URL | Notes |
|---------|-----|-------|
| **Web (main)** | `https://engage360-web.onrender.com` | Landing, login, admin/employee portal |
| **Web login** | `https://engage360-web.onrender.com/login` | Tenant: `sumaya` (or empty for platform admin) |
| **API base** | `https://engage360-api-qhnr.onrender.com/api` | Global prefix `api` on all routes |
| **API health** | `https://engage360-api-qhnr.onrender.com/api/health` | `{ status: "ok", timestamp }` |
| **API metrics** | `https://engage360-api-qhnr.onrender.com/api/health/metrics` | Tenant/user/employee/audit counts |
| **Platform status** | `https://engage360-api-qhnr.onrender.com/api/v1/platform/status` | Catalogue counts (features, modules, APIs, …) |
| **OpenAPI** | `https://engage360-api-qhnr.onrender.com/api/v1/openapi.json` | Generated API spec |

### Public web routes (no login)

| Route pattern | Example (demo) | Purpose |
|---------------|----------------|---------|
| `/` | `https://engage360-web.onrender.com/` | Landing page |
| `/careers/{tenant}/{client-slug}` | `…/careers/sumaya/sumaya-internal` | **Preferred** — tenant-scoped careers page |
| `/careers/{client-slug}` | `…/careers/sumaya-internal` | Alternate route (also supported) |
| `/onboarding/{tenant}/{token}` | `…/onboarding/sumaya/{token}` | New-joiner portal (emailed after offer) |
| `/onboarding/{token}` | `…/onboarding/{token}` | Alternate route (tenant segment recommended) |

### Public API endpoints

| Endpoint | Method | Notes |
|----------|--------|-------|
| `/api/public/careers/{clientSlug}` | GET | List published jobs for a hiring client |
| `/api/public/careers/jobs/{jobId}` | GET | Job detail |
| `/api/public/careers/jobs/{jobId}/apply` | POST | Submit application |
| `/api/public/onboarding/{token}` | GET | Onboarding portal data |
| `/api/public/onboarding/{token}/documents` | POST | Upload identity docs |
| `/api/public/onboarding/{token}/skills` | POST | Submit skills |
| `/api/public/onboarding/{token}/policies/{id}/acknowledge` | POST | Acknowledge policy |
| `/api/public/onboarding/{token}/complete` | POST | Set password & submit |

**Render free-tier note:** After ~15 minutes of inactivity the first request may take up to ~60 seconds while the server wakes (`docs/USER-MANUAL.md`).

---

## 2. Local development URLs & bootstrap

### URLs

| Surface | URL | Config source |
|---------|-----|---------------|
| **Web** | `http://127.0.0.1:4200` | `cd apps/web && npm start` (Playwright uses `--port 4200`) |
| **Web login** | `http://127.0.0.1:4200/login` | |
| **API base** | `http://localhost:3000/api` | `apps/web/src/environments/environment.ts` |
| **API health** | `http://localhost:3000/api/health` | |
| **API metrics** | `http://localhost:3000/api/health/metrics` | |
| **Careers (local)** | `http://127.0.0.1:4200/careers/{tenant}/{client-slug}` | |
| **Onboarding (local)** | `http://127.0.0.1:4200/onboarding/{tenant}/{token}` | |

### Docker + bootstrap steps

```bash
# 1. Start Postgres (Docker)
docker compose up -d
# → port 15433, user/pass/db: engage360

# 2. API environment
cp apps/api/.env.example apps/api/.env
# Set DATABASE_URL for compose:
#   postgresql://engage360:engage360@localhost:15433/engage360?schema=engage360

# 3. API migrate + run
cd apps/api
npm install
npx prisma migrate deploy
npm run start:dev
# → http://localhost:3000/api/health

# 4. Web (separate terminal)
cd apps/web
npm install
npm start
# → http://127.0.0.1:4200
```

**Fresh local database:** No users are seeded by migrations. Register platform admin first (`POST /api/auth/register`), then create a tenant via the Tenants API or UI.

---

## 3. Tenant model

| Concept | Detail |
|---------|--------|
| **Tenant code** | Subdomain string entered at login, e.g. `sumaya` |
| **Demo tenant** | `sumaya` — pre-provisioned on Render with walkthrough users |
| **`x-tenant-id` header** | Sent on every authenticated API call; accepts subdomain **or** tenant UUID |
| **Web (Render)** | Single domain — tenant typed at login; interceptor adds `x-tenant-id` |
| **Web (future)** | Subdomain of host resolves tenant (`acme.engage360.com` → `acme`) per `README.md` |
| **Public pages** | Careers/onboarding URLs with `/{tenant}/` segment pass tenant to API explicitly |
| **Platform admin** | Leave tenant field **empty** at login; no `x-tenant-id`; JWT `tenantId = null` |
| **Data isolation** | All business data scoped per tenant; platform admin manages tenant catalogue only |

---

## 4. Role-wise logins

### Render / demo tenant `sumaya`

| Role | Tenant | Email | Password | Render | Notes |
|------|--------|-------|----------|--------|-------|
| **Platform Admin** | *(empty)* | `admin@engage360.com` | `Admin@12345` | If registered | First `POST /auth/register` user becomes platform admin; registration disabled after that |
| **Tenant Admin** | `sumaya` | `owner@sumaya.com` | `Owner@12345` | Yes | Primary demo admin; full tenant access |
| **HR** | `sumaya` | `walk-hr@sumaya.com` | `Walk@12345` | Yes | ATS, onboarding, BGC admin, reports |
| **Manager** | `sumaya` | `walk-mgr@sumaya.com` | `Walk@12345` | Yes | Team approvals, timesheets, inbox |
| **Employee** | `sumaya` | `walk-emp@sumaya.com` | `Walk@12345` | Partial | Login works; some ESS endpoints may 404 if no linked `Employee` record on Render |
| **BGC Vendor** | `sumaya` | `walk-bgc@sumaya.com` | `Walk@12345` | Yes | BGV cases portal only (`/bgc-vendor`) |

### Local-only accounts (created by tests — not on Render)

These are provisioned automatically when you run local Playwright or API e2e tests against a fresh database.

| Source | Tenant pattern | Email pattern | Password | Roles |
|--------|----------------|---------------|----------|-------|
| `apps/web/e2e/ui.spec.ts` | `ui-a-{run}` / `ui-b-{run}` | `owner@{tenant}.test` | `Flow@12345` | TENANT_ADMIN |
| same | | `manager@{tenant}.test` | `Flow@12345` | EMPLOYEE + MANAGER |
| same | | `employee@{tenant}.test` | `Flow@12345` | EMPLOYEE |
| same | | `interviewer@{tenant}.test` | `Flow@12345` | INTERVIEWER |
| same | | `vendor@{tenant}.test` | `Flow@12345` | BGC_VENDOR |
| `apps/web/e2e/ui-full.spec.ts` | `ui-full-{run}` | `owner@{tenant}.test` | `Flow@12345` | TENANT_ADMIN |
| same | | `leave@{tenant}.test` | `Flow@12345` | EMPLOYEE |
| `apps/api/test/e2e.mjs` | `e2e-{run}` | `owner@{tenant}.test` | `Owner@12345` | TENANT_ADMIN |
| same | | `hr@{tenant}.test` | `Hr@1234567` | HR |
| same | | `interviewer@{tenant}.test` | `Interviewer@123` | INTERVIEWER |
| same | | `vendor@{tenant}.test` | `Vendor@12345` | BGC_VENDOR |
| same | | `manager@{tenant}.test` | `Manager@123` | EMPLOYEE + MANAGER + DEPARTMENT_HEAD |
| same | | `cand@{tenant}.test` | `Newhire@123` | EMPLOYEE (after onboarding flow) |
| Platform bootstrap | *(empty)* | `admin@engage360.com` | `Admin@12345` | PLATFORM_ADMIN |

**Manual local setup:** Register platform admin → create tenant (subdomain + admin credentials) → log in with tenant subdomain.

---

## 5. Mobile launch commands (Flutter)

**Prerequisites:** Flutter stable at `C:\flutter` (verified 3.44.6 / Dart 3.12.2); add `C:\flutter\bin` to PATH. Windows desktop builds require **Developer Mode**; web builds do not.

```powershell
$env:Path = "C:\flutter\bin;" + $env:Path
cd apps/mobile
flutter pub get
```

### Dart defines

| Define | Purpose | Default when unset |
|--------|---------|-------------------|
| `API_BASE` | API root URL | Platform-specific (see `api_client.dart`) |
| `API_URL` | Alias for `API_BASE` | Same |
| `TENANT` | Pre-fill tenant on login screen | `sumaya` |

### Run — Render API (production)

```powershell
# Default device
flutter run --dart-define=API_BASE=https://engage360-api-qhnr.onrender.com/api --dart-define=TENANT=sumaya

# Chrome
flutter run -d chrome --dart-define=API_BASE=https://engage360-api-qhnr.onrender.com/api --dart-define=TENANT=sumaya

# Windows
flutter run -d windows --dart-define=API_BASE=https://engage360-api-qhnr.onrender.com/api --dart-define=TENANT=sumaya

# Android emulator
flutter run -d android --dart-define=API_BASE=https://engage360-api-qhnr.onrender.com/api --dart-define=TENANT=sumaya
```

### Run — local API (port 3000)

| Target | Command |
|--------|---------|
| **Android emulator** | `flutter run --dart-define=API_BASE=http://10.0.2.2:3000/api --dart-define=TENANT=sumaya` |
| **iOS simulator / desktop / web / Chrome** | `flutter run --dart-define=API_BASE=http://localhost:3000/api --dart-define=TENANT=sumaya` |
| **Chrome (explicit)** | `flutter run -d chrome --dart-define=API_BASE=http://localhost:3000/api --dart-define=TENANT=sumaya` |
| **Windows (explicit)** | `flutter run -d windows --dart-define=API_BASE=http://localhost:3000/api --dart-define=TENANT=sumaya` |

### Build

```powershell
flutter build web --dart-define=API_BASE=https://engage360-api-qhnr.onrender.com/api --dart-define=TENANT=sumaya
# → apps/mobile/build/web/

flutter build windows --dart-define=API_BASE=https://engage360-api-qhnr.onrender.com/api --dart-define=TENANT=sumaya
# → apps/mobile/build/windows/x64/runner/Release/engage360_mobile.exe
```

### Integration test (Chrome)

```powershell
flutter test integration_test/app_test.dart -d chrome
# Optional overrides:
#   --dart-define=TENANT_ID=sumaya
#   --dart-define=TEST_EMAIL=owner@sumaya.com
#   --dart-define=TEST_PASSWORD=Owner@12345
```

### Verify

```powershell
flutter analyze    # expected: no issues
flutter test       # 1/1 passed
```

---

## 6. E2E environment variable overrides

### Playwright — `apps/web`

| Variable | Default (local) | Default (Render / remote) | Used by |
|----------|-----------------|---------------------------|---------|
| `WEB_URL` | `http://127.0.0.1:4200` | `https://engage360-web.onrender.com` | All e2e specs; `playwright.remote.config.ts` |
| `API_URL` | `http://127.0.0.1:3000/api` | `https://engage360-api-qhnr.onrender.com/api` | `ui-full.spec.ts`, `ui.spec.ts`, `walkthrough-capture-bgc.spec.ts` |
| `E2E_TENANT` | — | `sumaya` | `walkthrough-capture*.spec.ts`, `ui-full.spec.ts` (remote) |
| `E2E_EMAIL` | — | `owner@sumaya.com` | `ui-full.spec.ts` (remote) |
| `E2E_PASSWORD` | — | `Owner@12345` | `ui-full.spec.ts` (remote) |
| `E2E_EMPLOYEE_EMAIL` | — | `walk-emp@sumaya.com` | `ui-full.spec.ts` (remote) |
| `E2E_EMPLOYEE_PASSWORD` | — | `Walk@12345` | `ui-full.spec.ts` (remote) |

`ui-full.spec.ts` detects remote mode when `WEB_URL` contains `onrender.com`. Local mode creates ephemeral tenant `ui-full-{run}` with password `Flow@12345`.

### Run commands

```bash
# Local (auto-starts API + web via playwright.config.ts webServer)
cd apps/web
npx playwright test

# Remote Render (no local webServer)
cd apps/web
npx playwright test -c playwright.remote.config.ts

# Walkthrough screenshot capture (Render)
WEB_URL=https://engage360-web.onrender.com npx playwright test walkthrough-capture.spec.ts

# Full lifecycle UI (Render)
WEB_URL=https://engage360-web.onrender.com npx playwright test e2e/ui-full.spec.ts -c playwright.remote.config.ts
```

### API e2e — `apps/api/test/e2e.mjs`

| Variable | Default | Notes |
|----------|---------|-------|
| `API_URL` | `http://localhost:3000` | Host only (script appends `/api`) |
| `ADMIN_EMAIL` | `admin@engage360.com` | Platform admin login |
| `ADMIN_PASSWORD` | `Admin@12345` | Platform admin login |

```bash
cd apps/api
node test/e2e.mjs
# Against Render:
API_URL=https://engage360-api-qhnr.onrender.com node test/e2e.mjs
```

Creates isolated throwaway tenant `e2e-{run}` per run — safe on production.

---

## Related docs

| Doc | Contents |
|-----|----------|
| [`docs/USER-MANUAL.md`](USER-MANUAL.md) | Full feature walkthrough, UI fields, status glossary |
| [`apps/mobile/README.md`](../apps/mobile/README.md) | Mobile architecture, modules, gaps |
| [`docs/PARITY.md`](PARITY.md) | Web ↔ mobile parity matrix, local verify steps |
| [`docs/video-walkthrough/README.md`](video-walkthrough/README.md) | Screenshot/video regeneration |
