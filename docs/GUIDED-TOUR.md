# SumayaEngage360 — Complete Guided Tour

**Updated:** 2026-07-19 · Covers every module, every supported country, and the
recommended demo path. Companion references: `URLS-AND-LOGINS.md` (credentials),
`INTRANET-AND-BRANDING.md` (newest features), `TENANT-TYPES.md`, `USER-MANUAL.md`.

---

## 1. Five-minute orientation

SumayaEngage360 is a **multi-tenant hire-to-exit platform**: ATS + employee
lifecycle + payroll/benefits + performance + compliance + company intranet.
Four business segments, each with its own branded login:

| Segment | Login | Demo tenant | What they get |
|---|---|---|---|
| Company (hire-to-exit) | `/login/company` | `acme` / `admin@acme.demo` | Full lifecycle: ATS → onboarding → HR ops → payroll → performance → exit |
| Recruitment agency | `/login/agency` | `talentbridge` | Talent pool, client submissions, contact CRM |
| Staffing / contracting | `/login/staffing` | `staffpro` | Contracts, contractor deployment, timesheets & billing |
| Individual recruiter | `/login/recruiter` | `jane-recruits` | Lightweight personal sourcing desk |
| Platform operations | `/login/platform` | `admin@engage360.com` | Tenant provisioning & governance |

Every tenant is isolated (`tenantId` on every table, subdomain or
`x-tenant-id` scoping, JWT bound to the tenant). Roles: TENANT_ADMIN, HR,
MANAGER, EMPLOYEE, INTERVIEWER, DEPARTMENT_HEAD, BGC_VENDOR (+ PLATFORM_ADMIN).

**Recommended demo order (Company tenant):**
Intranet → Settings (branding) → Jobs → Applications → Offer → Preboarding →
Onboarding → Employees → Leave/Timesheets → Payroll → Appraisals → Exit →
Audit trail.

---

## 2. Module-by-module tour

### Platform group
- **Dashboard** (`/dashboard`) — role-aware KPIs (open jobs, pending approvals, headcount, attrition).
- **Intranet** (`/intranet`) — SharePoint-style company portal. Home page: rotating
  hero banners, Featured (pinned) content, department hub tiles, Latest updates.
  Department hub: left rail with up to **3 category levels**, banners per
  department and per category. Content types: article, document, video, poster,
  link — each with audience security (company / department / roles / private)
  and a **view-only switch** that blocks downloads server-side. Publishers
  (admin/HR anywhere, department heads for their department) get a
  **Manage & publish** studio: draft → review → publish → archive.
- **Reports** (`/reports`) — RPT-001…026 catalogue, module-scoped report tabs, CSV export.
- **Settings** (`/settings`) — **Company branding** (logo upload, primary/accent
  colors, tagline — retheme the whole workspace per tenant), branches, shifts,
  custom field definitions per entity, feature flags, integrations, config areas.
- **Catalogues / Requirements / Execution** — the functional spec (data entities,
  APIs, features) tracked as live checklists with implementation status.
- **Audit trail** (`/audit`) — every mutation on every table, auto-captured:
  who, what, when, **source IP, device type (mobile/tablet/desktop/API) and raw
  user-agent**. Filterable and exportable; per-module audit tabs too.
- **Tenants** (platform only) — provisioning wizard: type, portals, country +
  operating countries (from the jurisdiction catalog), admin account.
- **User accounts** (`/users`) — invite users, assign any tenant role incl.
  department head and BGV vendor.

### Recruitment (ATS)
- **Hiring clients** (`/clients`) — client companies for agency/staffing hiring.
- **Jobs** (`/jobs`) — openings with skills, JD library, team members, careers-page publishing.
- **Talent pool** (`/candidates`) — candidates, resume parsing, skills, experience, match scores.
- **Applications** (`/applications`) — pipeline: screening → interviews (structured
  rounds + results) → offer (salary structure from components) → hired. Custom
  per-tenant fields appear here.
- **Global mobility** (`/global-mobility`) — per-country work-authorization cases:
  jurisdiction profiles, permit types from the country catalog, sponsorship
  flags, verification evidence, **expiry dashboard** for renewals.
- **Careers pages** — public per-tenant job listings (`/careers/{tenant}/{slug}`).

### Agency CRM / Staffing
- **Client submissions** — submit pooled candidates to client jobs, track status.
- **Agency contacts** — client-side contact book.
- **Contracts / Contractors** — staffing contracts, rate cards, contractor
  assignments, deployment & bench tracking.

### Workforce & HR
- **Preboarding** (`/preboarding-admin`) — document requirements per jurisdiction,
  offer-to-join tracking, BGV package selection.
- **Onboarding** (`/onboarding` + public portal via emailed token) — new-joiner
  portal: identity documents, policy acknowledgements, BGV vendor handoff
  (`/bgc-vendor` for the vendor), tasks, buddy/manager assignment.
- **Employees** (`/employees`) — employee master: personal data (separate
  PII table), codes, departments, designations, skills, salary structures,
  documents, reporting lines.
- **Departments** (`/org`) — org structure; department heads sign exit NOCs and
  publish on the intranet.
- **Exit management** (`/exit`) — resignation → notice → multi-department
  clearances → full & final settlement.

### Operations
- **Projects** (`/projects`) — projects, allocations (allocation %, billing), manager links.
- **Manpower** (`/manpower`) — manpower requisitions: draft → submit → approve ⇒ auto-creates a job.
- **Assets** (`/assets`) — asset registry and assignment/return with exit-clearance hooks.
- **Attendance & leave** (`/leave`) — punches, geofencing zones, regularization,
  leave types/balances/requests with approval chains, holiday calendars per country.
- **Timesheets** (`/timesheets`) — weekly entries per project, submit → manager approval → billing.

### Compensation
- **Payroll** (`/payroll`) — salary component masters, payroll calendars, runs,
  payslips, adjustments, tax declarations (India: old/new regime).
- **Benefits** (`/benefits`) — plans and enrollments.
- **Expenses** (`/expenses`) — claims with line items and approval workflow.

### Performance
- **Goals** (`/goals`) — goal library, employee goals, progress tracking, KPI/competency libraries.
- **Appraisals** (`/appraisals`) — cycles, self/manager reviews, rating scales, calibration sessions.
- **Trainings** (`/trainings`) — courses, **locked video player** (server-side
  no-skip heartbeats), quizzes, assignments.
- **Recognition / Surveys** — recognitions, feedback, eNPS surveys.

### Workflow & Administration
- **Approvals inbox** (`/approvals`) — unified pending approvals across entities;
  configurable workflows (`/workflows`) with steps, delegation, rules, versions.
- **Notifications** (`/notifications`) — templates and delivery log.
- **Org masters / Masters** — legal entities, locations, business units, cost
  centers, grades, employment types, holiday calendars, rate cards, country
  configs — all DB-driven (no hard-coded business data).
- **Privacy & consent** (`/privacy`) — consent records, DSRs (access/erasure), retention policies.
- **Compliance** (`/compliance`) — compliance cases, POSH/grievance style workflows.

### Mobile app (Flutter)
Full parity for employee/manager/HR flows (see `apps/mobile/PARITY.md`).
Intranet is web-only for now.

---

## 3. Country-by-country: how global hiring works

Hiring is **jurisdiction-aware end to end**: tenants declare a primary country +
operating countries; each jurisdiction drives employer registrations, candidate
fields, permitted work-authorization types, verification methods and the
lifecycle stages. Everything below comes from the live catalog
(`GET /jurisdictions/catalog` — also shown on the public landing page) and is
configured per tenant at `/global-mobility`.

Common to every country: employer legal-entity intake (registration, payroll &
social insurance accounts, compliance/privacy owners, record-retention policy)
and candidate profile (identity, contacts, emergency contact, bank verification,
privacy/retention acknowledgements). Sensitive fields are flagged and staged
(client intake → candidate → offer → preboarding → verification).

### 🇮🇳 India (IN) — primary jurisdiction (INR, Asia/Kolkata)
- **Employer:** legal structure (Pvt Ltd/LLP/…), CIN/LLPIN, PAN, TAN, GSTIN,
  **EPFO establishment ID, ESIC employer code**, employment state/UT,
  professional tax & labour-welfare registrations, Shops & Establishments/factory registration.
- **Candidate:** state of employment, Aadhaar (last 4, where lawful), PAN,
  **UAN (EPFO), ESIC IP number**, income-tax regime (old/new), EPF/EPS
  nomination; for foreign nationals: passport + **FRRO/FRO registration**.
- **Work authorization:** Indian citizen, OCI, Employment visa, Project visa,
  Intern visa, dependant-with-permission (sponsorship flags modelled).
- **Verification:** citizenship/OCI evidence, employment-visa review, FRRO
  evidence, **EPFO UAN KYC**, ESIC registration.
- **Lifecycle:** entity/state intake → state-specific terms → consent & identity →
  offer + authorization assessment → BGV → PAN/TAN payroll setup → EPFO/ESIC
  activation → attendance & state compliance → transfer/renewal/exit.

### 🇺🇸 United States (US)
EIN, E-Verify company ID, SOC codes, state payroll/workers-comp accounts,
**Form I-9 flow** (List A / B+C document paths, Section-2 dates, remote
examination, reverification monitoring), E-Verify case references. Permits:
citizen/PR/EAD, H-1B, H-1B1, H-2A/B, L-1A/B, O-1, TN, E-3, E-1/E-2, F-1 CPT/OPT, J-1.

### 🇬🇧 United Kingdom (GB)
Companies House number, **sponsor licence** + expiry, PAYE reference, workplace
pension duties; candidate NI number and **right-to-work share codes** with
check dates, outcomes and follow-up scheduling. Routes: British/Irish, settled
status, Skilled Worker, Health & Care, GBM, Scale-up, Global Talent, Graduate,
HPI, Youth Mobility, Temporary Worker.

### 🇨🇦 Canada (CA)
CRA business number, province, **LMIA / Employer-Portal offer numbers**,
NOC/TEER codes, provincial payroll & workers-comp; candidate SIN (incl.
temporary SIN expiry), permit employer/location/occupation conditions, IRCC
six-year employer record clock. Permits: citizen/PR, LMIA employer-specific,
IMP, open permit, PGWP, IEC, study-permit work conditions.

### 🇦🇺 Australia (AU)
ABN, sponsor approval, ANZSCO codes, PAYG withholding, default super fund,
Fair Work award classification; candidate TFN, **VEVO consent + check dates and
evidence**. Permits: citizen/PR, SID 482, ENS 186, SESR 494, skilled
189/190/491, 485, working holiday, student, partner.

### 🇳🇿 New Zealand (NZ)
NZBN, employer IRD, **AEWV accreditation type + expiry, job-check tokens**,
KiwiSaver and ACC setup; candidate IRD, **VisaView consent/check/result**,
occupational registration. Permits: citizen/resident, AEWV, open work visa,
post-study, working holiday, partner, RSE seasonal.

### 🇪🇺 European Union (EU) — member-state aware
Selecting EU **requires the destination member state** (enforced server-side).
Company registration, VAT, member-state payroll & social insurance,
**GDPR lawful-basis record** and candidate data-processing basis + retention
notices. Permits: EU/EEA free movement, long-term resident, national permits,
**Single Permit, EU Blue Card, ICT permit**, researcher/student, seasonal,
temporary protection.

### 🇦🇪 United Arab Emirates (AE)
Trade licence (emirate/free zone) + expiry, **MoHRE establishment number,
immigration establishment card, permit quota**, WPS registration, mandatory
health insurance; candidate Emirates ID, medical fitness, attestation,
**MoHRE offer acceptance**, biometrics, residence/work-permit expiries.
13 permit routes incl. outside-recruitment, transfer, golden residence, green
visa, freelance.

### 🇸🇦 🇶🇦 🇧🇭 🇰🇼 🇴🇲 GCC (SA, QA, BH, KW, OM)
Shared GCC model with the national authority wired per country — Saudi Arabia
(Ministry of HR / **Qiwa**, Iqama), Qatar (Ministry of Labour, Qatar ID),
Bahrain (**LMRA**, CPR), Kuwait (PAM, Civil ID), Oman (Ministry of Labour,
resident card): commercial registration & licence expiry, establishment
numbers, sponsor details, occupation approval, nationalisation/quota status,
**wage-protection registration**, mandatory health insurance; candidate
passport/national ID, medical fitness, attestation, biometrics, registered
contract acknowledgement. Lifecycle: licence & quota intake → offer & registered
contract → work permit/entry → medical & biometrics → residence/ID issuance →
payroll activation → renewal/transfer/cancellation.

Each jurisdiction ships with **official source links** (USCIS, GOV.UK, IRCC,
Home Affairs, INZ, EU portal, u.ae, Qiwa, LMRA…) and a compliance notice; the
**expiry dashboard** tracks permits, licences and re-verification dates across
all of them.

---

## 4. No-hard-coding policy (state as of 2026-07-19)

- Master/business data (departments, designations, salary components, leave
  types, holiday calendars, grades, rate cards, country configs…) is **all
  database-driven** via Masters/Org-masters.
- Country/jurisdiction data lives in **one catalog** (`jurisdiction.catalog.ts`)
  served by `GET /jurisdictions/catalog`; the landing page and the tenant
  provisioning wizard both consume the API (inline lists removed — only a
  1-entry bootstrap fallback remains for when the API is unreachable).
- Role lists in the UI now derive from the shared RBAC module (`TENANT_ROLES`) —
  this also fixed User accounts missing the DEPARTMENT_HEAD role.
- Tenant defaults (`IN`, `INR`, `Asia/Kolkata`) are **intentional India-first
  defaults**, overridable per tenant at creation and in the onboarding wizard.
- Storage is env-driven (local disk ↔ S3/R2/B2) — no code change to migrate assets.
- Remaining intentional constants: workflow status enums, RBAC route matrix,
  and theme fallback colors — these are product logic, not business data.

---

## 5. Recommendations (suggested roadmap)

1. **Mobile intranet parity** — Flutter screens for hubs/categories/viewer
   (server APIs are ready; view-only flag must be respected in the app).
2. **Rich-text editor for intranet articles** — body is plain text today;
   add markdown or a WYSIWYG with sanitization.
3. **Multi-step publishing approval** — today review→publish is one approver;
   route through the existing ApprovalWorkflow engine for regulated tenants.
4. **India payroll depth** — statutory calculation packs (PF/ESI/PT/LWF/TDS
   by state) on top of the component model; Form 16 generation.
5. **Notifications for intranet** — notify department members on publish;
   digest email of featured content.
6. **Search** — server-side full-text (Postgres tsvector) across intranet +
   documents instead of title/summary contains.
7. **Object storage in production** — set `S3_BUCKET`/`S3_ENDPOINT` on Render
   (uploads on local disk are ephemeral across deploys there).
8. **Per-tenant login branding** — extend tenant branding to the public login
   page via subdomain lookup (branding API is already public-safe to add).
9. **SSO** — the `SsoProvider` model exists; wire SAML/OIDC login for enterprise tenants.
10. **Antivirus scan hook on uploads** — flagged in `files.controller.ts`;
    recommended before opening the intranet to end-user uploads.
