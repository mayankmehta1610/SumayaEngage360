# SumayaEngage360 — Module Specifications

This is the authoritative functional spec, capturing every requirement end to end.

---

## 1. Multi-tenancy & platform administration

- Platform operator creates and manages **tenants** (client companies on the SaaS).
- Each tenant gets a **subdomain** (`acme.engage360.com`) and branding (logo, colors).
- All data rows carry `tenantId`; the API resolves the tenant from the subdomain or the
  `x-tenant-id` header and scopes every query to it.
- Tenant settings: country (drives identity-document requirements), currency, timezone,
  appraisal cycle configuration, approval workflow configuration.

## 2. Applicant Tracking System (ATS)

### 2.1 Hiring clients & public careers URLs
- A tenant can hire for **its own openings or on behalf of hiring clients** (staffing model).
- Each hiring client gets a **public careers URL** (e.g. `acme.engage360.com/careers/clientX`)
  listing all open roles with: title, full JD, number of vacancies, location(s),
  employment type, required skills.
- Tenants create/manage this content from their admin portal; publishing makes it public.

### 2.2 Candidate application
- Public application form: full profile + demographics, work experience, education.
- **Resume upload**; auto-parsing via LLM planned (parser interface is pluggable —
  candidates can upload a CV now, parsing fills the profile later).
- **Skills are tagged at application time** (mandatory) — reused later during onboarding.
- Candidate selects the role they are applying to.

### 2.3 Interview cycle
- Configurable **interview levels/rounds** per job (e.g. screening → technical → managerial → HR).
- Each round records: interviewer(s), schedule, mode, feedback, rating, result.
- **Recording integration**: each round can attach a recording from any tool
  (Teams, Zoom, Meet — via upload or link). Recording is stored per interview level.
- **Mandatory screenshot** per round as proof the interview happened.
- Full audit trail of who took which round and the outcome.

### 2.4 Offer
- On selection, an **offer** is generated: salary structure (offered), designation,
  joining date, location. Offer letter document generated and sent.
- Candidate accepts/declines. Acceptance triggers the **onboarding flow**.

## 3. Onboarding

- On offer acceptance the candidate receives a **secure URL** to complete onboarding:
  - Remaining demographic details (whatever wasn't captured at application).
  - **Identity/demographic document uploads based on operating country**
    (India: Aadhaar, PAN, etc. — the requirement list is country-configurable per tenant).
  - Skills: pre-filled from application-time tags; candidate adds any missing ones.
  - Submit everything for **verification** by HR.
- **Background check (BGC)**:
  - BGC case submitted to a **third-party vendor**; vendors get restricted portal access
    to pick up cases and upload their reports.
  - BGC status/report is **hidden from the employee**; everything else on their profile is visible to them.
- **Onboarding approvals**: configurable approvers (by designation) sign off the onboarding.
- **Guided onboarding tool** for new joiners (checklist/wizard from day one).
- **Policy acknowledgement**: company policies (data security, code of conduct, etc.)
  presented to the employee; explicit confirmation recorded per policy per version.

## 4. Employee lifecycle

### 4.1 Core records
- Employee master: code, designation, department, manager, join date, location, status.
- **Departments** with department heads (used for exit NOCs and org structure).
- Designations (used by the approval engine to resolve approvers).

### 4.2 Salary
- **Salary structure**: offered vs current, component breakdown (basic, HRA, allowances),
  deductions, tax calculations, revision history.

### 4.3 Projects & resource allocation
- **Projects** belong to a client **or are internal** (e.g. internal initiatives, bench).
- Project details: client, location/deployment, dates, project manager.
- **Allocation**: employee → project at a **percentage** (full-time/part-time), with dates;
  an employee's total live allocation is tracked over time.
- **Manager assignment happens when the employee joins a project** — the project manager
  becomes the reporting/appraising manager.

### 4.4 Timesheets
- **Two types: internal timesheet and client-facing timesheet.**
- Entries per project/task per day; submission per period.
- **Approval/discard workflow by the manager** (approve, reject with reason, resubmit).

### 4.5 Appraisals (fully customizable)
- Tenant-defined **review cycles**: quarterly, half-yearly, yearly — any cadence.
- Configurable templates: goals/KRAs, competencies, rating scales.
- Flow: self-review → appraiser (project/reporting manager) → reviewer → normalization → outcome.
- Outcomes: rating, increment/benefits, promotion recommendation.

### 4.6 Recognition & benefits
- **Instant recognition** module: badges/awards/points, visible on a feed; manager and peer initiated.
- Benefits catalog tied to appraisal outcomes or standalone grants.

### 4.7 Feedback (360°)
- Feedback by manager → employee, employee → manager, **peer/360-degree** feedback.
- Can be cycle-bound (with appraisals) or ad hoc; anonymous option configurable.

### 4.8 Assets
- Asset registry; **what assets each employee holds** (laptop, access card, etc.);
  issue/return tracking — feeds the exit clearance.

### 4.9 Trainings
- Courses assigned to employees; **mandatory trainings** flagged.
- **Video playlist with a locked player**: for mandatory videos there is **no fast-forward,
  no skip, no close** — the video must be watched end to end; server-side watch-progress
  validation marks it complete (client alone is not trusted).
- **Quizzes attached to videos/courses**; passing can be required for completion.
- Onboarding-time mandatory trainings are part of the guided joiner flow.

## 5. Exit process (end to end)

1. Employee **submits resignation** (with reason, requested last working day).
2. **Approval chain** resolves by designation (configurable) — manager, department head, HR.
3. Notice period computed; last working day settled.
4. **Departmental NOC/clearance**: every department (IT, Finance, Admin, HR...) must sign off —
   assets returned, dues cleared. **Department heads sign off, and can delegate to subordinates.**
5. Knowledge transfer / handover checklist.
6. Once all clearances complete: **release/relieving letter generated**;
   **full & final settlement** computed and recorded; final letters issued on F&F completion.

## 6. Approval engine (cross-cutting)

- Configurable, **designation-based approval workflows** per entity type:
  onboarding, resignation, timesheets, offers, allocations, NOCs...
- Multi-step chains; each step resolves approvers by designation, department role, or named user.
- Full action log (approved/rejected/delegated, when, by whom, comments).

## 7. Mobile app (employee self-service)

- Flutter app covering: profile, document upload, timesheet entry + submission,
  approvals inbox (for managers), trainings (locked video player), recognition feed,
  feedback, payslips/salary view, resignation submission and exit tracking.

## 8. Non-functional

- Every API call tenant-scoped; RBAC per role (platform admin, tenant admin, HR, manager,
  employee, interviewer, BGC vendor, department head).
- Audit log on sensitive actions.
- File storage abstracted (S3-compatible) for resumes, identity documents, recordings,
  screenshots, generated letters.
- BGC data visibility restricted from employees at the API layer.
