# SumayaEngage360 — Complete User Manual

**Applicant Tracking + Employee Lifecycle Management, end to end.**
This manual explains every role, every module, every screen and every field in the system.

- **Website:** https://engage360-web.onrender.com
- **API health:** https://engage360-api-qhnr.onrender.com/api/health
- ⏱ *Free hosting note: after ~15 minutes of inactivity the first request takes up to 60 seconds while the server wakes up. This is normal.*

---

## 1. Signing in

Open the website and click **Login** (top-right of the home page). The sign-in form has three fields:

| Field | What to enter |
|---|---|
| **Tenant** | Your company's workspace code (subdomain). For the demo company enter `sumaya`. **Platform administrators leave this empty.** |
| **Email** | Your login email |
| **Password** | Your password |

After signing in you land on the **Dashboard**. The left sidebar lists every module your role can use; the bottom shows your name and a **Sign out** link.

### 1.1 The roles

| Role | Who they are | Main responsibilities |
|---|---|---|
| **Platform Admin** | The SaaS operator | Creates and manages tenant companies |
| **Tenant Admin** | Company owner/administrator | Everything inside one company: users, org, hiring, projects |
| **HR** | Recruiters & HR executives | ATS pipeline, interviews, offers, onboarding, BGC, matching, exits |
| **Manager** | Reporting/project managers, department heads | Timesheet approvals, appraisals, exit NOC sign-offs, approvals inbox |
| **Employee** | Every staff member | Timesheets, trainings, recognition, feedback, salary view, resignation |
| **Interviewer** | Panel members | View applications, record interview results |
| **BGC Vendor** | Third-party verification agency | Sees only assigned background checks; uploads reports |

A user can hold several roles at once (e.g. an "Operator" with HR + Manager).

---

## 2. Public pages (no login needed)

### 2.1 Landing page `/`
Explains the product. Buttons: **Login** (top-right and in the hero) and **View open roles** (opens the internal careers page).

### 2.2 Careers pages `/careers/<client-slug>`
Every hiring client gets its own public URL (e.g. `/careers/sumaya-internal`, `/careers/acme-retail`). The page shows the client's name and description, then one card per **published** job:

- **Title**, **vacancies badge**, **location**, **employment type**, **experience range**
- The full **job description (JD)**
- **Skill badges** (required skills)
- An **Apply now** button that opens the application form:

| Field | Required | Notes |
|---|---|---|
| First name / Last name | ✅ | Candidate's name |
| Email | ✅ | Used to identify the candidate; re-applying to the same job is blocked |
| Phone | — | Contact number |
| **Your skills** | ✅ | Comma separated. *Skill tagging is mandatory at application time* — these skills follow the candidate into onboarding and drive match scoring |
| Experience (most recent role) | — | Company, title, start date, end date |
| Resume | — | PDF/DOC upload. Parsed automatically (see §5.4) |

On submit the application appears instantly in HR's **Applications** page.

### 2.3 Onboarding portal `/onboarding/<token>`
New joiners receive this secure link after accepting an offer (see §6.4). Four numbered sections:

1. **Identity documents** — one row per document required for the company's country (India: Aadhaar, PAN). Mandatory items are badged. Upload a file per row; uploaded rows show ✅.
2. **Your skills** — pre-filled from application-time tags (marked ✓); add missing ones comma-separated.
3. **Company policies** — each policy with version and a mandatory badge; click **"I have read & agree"** to acknowledge.
4. **Set your password & submit** — choose the portal password (min 8 characters) and press **Submit for verification**. Submission is **blocked** until every mandatory document is uploaded and every mandatory policy acknowledged. After submitting, the new joiner can already log in with their email + this password while HR verifies.

---

## 3. Platform Admin

*Login with the Tenant field **empty**.*

### 3.1 Tenants page
Create a client company on the SaaS:

| Field | Meaning |
|---|---|
| Company name | Display name of the tenant |
| Subdomain | The tenant code users type at login (lowercase letters/digits/hyphens) |
| Country | Drives the identity-document checklist (default IN) |
| Admin email / password / first / last name | The tenant's first administrator account, created together with the tenant |

The table lists all tenants (name, subdomain, country, active status) with **Excel / PDF export**. The Platform Admin does not see tenant data — each tenant's workspace is isolated.

---

## 4. Tenant Admin

Everything below plus all HR functions. Unique to the Tenant Admin:

### 4.1 User accounts (API: `POST /users`)
Create non-employee logins — HR staff, interviewers, BGC vendor accounts. Fields: email, password (min 8), first/last name, and one or more roles (`HR`, `MANAGER`, `INTERVIEWER`, `BGC_VENDOR`, `EMPLOYEE`). PLATFORM_ADMIN cannot be granted.

### 4.2 Departments & designations page
- **Departments** — add by name; the table shows headcount. Use the **Set head** dropdown to appoint a department head (an employee) — *department heads sign exit NOCs* (§9).
- **Designations** — add name + level. Designations are used by the approval engine to resolve approvers (§10).

---

## 5. HR — Recruitment (ATS)

### 5.1 Hiring clients page
A "hiring client" is who you're hiring for — your own company (mark **Internal**) or an external client (staffing model). Fields: **Name**, **Careers URL slug** (becomes `/careers/<slug>`), **Description**. The table links directly to each public careers page.

### 5.2 Jobs page
Create a job:

| Field | Meaning |
|---|---|
| Title | Role title shown on the careers page |
| Hiring client | Which client this opening belongs to (or none) |
| Location, Vacancies | Shown publicly |
| Job description (JD) | Full text; also used by the AI matcher |
| Skills | Comma separated — required skills, used for skill badges and match scoring |
| Interview rounds | Comma separated **in order** (e.g. `Screening, Technical, HR`) — the planned interview levels |

Jobs start as **DRAFT**. Press **Publish** to put the job on the public careers page — publishing also automatically scores the existing talent pool against the JD in the background.

### 5.3 Matches panel (per job)
Click **Matches** on any job row:

- **Run rule-based match** — deterministic scoring: skill overlap (60%), experience fit (25%), title similarity (15%) → 0–100.
- **Run AI match** — Claude reads the JD and each candidate's full profile and scores fit with reasons (runs on the rule-based top 20; needs the AI key configured).
- The table shows each candidate's **Rule %, AI %, Final %**, matched skills, and shortlist status, with Excel/PDF export.
- **Auto-shortlisting:** candidates at/above the threshold (default 60) are shortlisted automatically — their application moves to **SCREENING**; candidates from **previous/other applications (the talent pool)** who match get a brand-new application on this job with source **TALENT_POOL**. This is how old resumes are re-used for every new JD.

### 5.4 Resume parsing — online and offline
- **Online:** the moment a candidate applies with a resume, it is parsed in the background (AI mode when configured).
- **Offline (scheduled):** a batch job runs **every 15 minutes** and parses every resume not yet processed — with AI when configured, otherwise with the built-in non-AI parser (text extraction + pattern matching for email, phone, "N years", and known skills). HR can run it on demand: `POST /matching/parse-pending`. A nightly job re-matches all published jobs so shortlists stay fresh.
- Parsed data (name, contact, total experience, skills, work history, education) is stored on the candidate record and powers matching.

### 5.5 Applications page
One card per application showing candidate name, email, the role, and the current **status badge**.

**Application statuses:** `APPLIED → SCREENING → INTERVIEW → SELECTED → OFFERED → OFFER_ACCEPTED → ONBOARDING → HIRED`, or `REJECTED` / `WITHDRAWN` / `OFFER_DECLINED`. Move an application with the **Move to status** dropdown + **Update**.

**Interview rounds** (in the same card):
- **Schedule round** — name (e.g. Technical), date/time, mode (`TEAMS / ZOOM / MEET / IN_PERSON`). Rounds are numbered levels in order.
- **Record result** — rating (1–10), result (`PASSED / FAILED / NO_SHOW`), recording URL (paste the Teams/Zoom recording link), feedback text, and a **screenshot upload — mandatory**: the system refuses to save a pass/fail verdict without proof the interview happened.
- The rounds table shows level, name, schedule, result badge, and ✔ marks for recording and screenshot.

**Offer** (appears once the application is **SELECTED**):

| Field | Meaning |
|---|---|
| Designation | The offered title (becomes the employee's designation) |
| Annual CTC | Offered package (becomes the first, "offered" salary structure) |
| Joining date, Location | Contract basics |

**Create offer** → **Send offer** (generates the **offer letter PDF** automatically and emails accept/decline links when SMTP is configured). When the candidate **accepts**, the system instantly: creates their user account + employee record (code `EMP-0001…`), copies their application-time skills, stores the offered salary structure, opens an onboarding case, and issues the secure onboarding link (§2.3).

### 5.6 Onboarding page (HR side)
- **Document requirements** — configure the per-country checklist: Country (e.g. `IN`), Code (e.g. `AADHAAR`), Name. Mandatory by default.
- **Cases** — one card per joiner with their submitted documents. **Verify** or **Reject** each document (rejected docs show the reason to HR).
- **Approve onboarding** — enabled when all documents are verified; flips the employee to **ACTIVE**. Onboarding statuses: `INVITED → IN_PROGRESS → DOCS_SUBMITTED → VERIFICATION → BGC → APPROVAL → COMPLETED`.

### 5.7 Background checks (BGC)
- Register vendors (name + email). Give the agency a login with the **BGC_VENDOR** role using the same email.
- Submit an employee's case to a vendor (`POST /bgc/employees/<id>/submit`). Statuses: `NOT_STARTED → SUBMITTED_TO_VENDOR → IN_PROGRESS → CLEAR / DISCREPANCY / FAILED`.
- **Visibility rule:** BGC status and reports are visible to HR/admin and the assigned vendor only — **never to the employee**, on any screen or API.

### 5.8 Policies
Create company policies (title, version, body/file, mandatory flag). Mandatory policies must be acknowledged during onboarding; acknowledgements are recorded per person per version.

---

## 6. Employees — day-to-day

### 6.1 Timesheets page
Two kinds, exactly as the business works:

| Field | Meaning |
|---|---|
| Type | **INTERNAL** (company time) or **CLIENT** (billable, tied to a client project) |
| Period start / end | The week/period covered |
| Day worked, Hours, Task | One entry per day (up to 24 h/day) |

**Create + submit** sends it to your reporting manager. Statuses: `DRAFT → SUBMITTED → APPROVED / DISCARDED` (a discarded sheet shows the manager's note and can be resubmitted).

### 6.2 Trainings
Assigned courses appear with their videos. **Mandatory videos play in a locked player — no fast-forward, no skip, no close.** The server, not the app, counts watch time: progress heartbeats are only credited up to real elapsed time, so jumping to the end does nothing. A video completes only when genuinely watched; attached **quizzes** are graded server-side against the passing score, and the course completes when all videos are watched and all quizzes passed.

### 6.3 Recognition & feedback
- **Recognition** — give a badge (e.g. *Star Performer*), a message and points to any colleague; public recognitions appear on the company feed.
- **Feedback** — four types: manager→employee, employee→manager, peer, and 360°; can be anonymous; can be tied to an appraisal cycle.

### 6.4 Salary
Employees see their own salary history (`/employees/me/salary`): the **offered** structure from their offer letter and every revision, with component breakdown — earnings (Basic, HRA…), deductions (PF), taxes (TDS) — and effective dates. HR/Admin manage revisions from the employee record; adding a new structure automatically closes the previous one, preserving full history (offered vs current).

### 6.5 Resignation
Submit with a reason and requested last working day (`POST /exit/resignations`). Withdrawal is possible until acceptance. The configured approval chain then runs (§10), typically starting with your reporting manager.

---

## 7. Manager

### 7.1 Timesheets → *Awaiting my approval*
Lists submitted timesheets from your direct reports with employee, type, project, period and total hours. **Approve** or **Discard** (with a note the employee sees). HR/Admin can also act as an override.

### 7.2 Appraisals → *My team's reviews*
When HR launches a cycle, you are automatically the **appraiser** for your reports (the reviewer is your own manager, when present). Flow per appraisal: employee **self-review** → your **manager review + rating** → optional reviewer finalization. Statuses: `SELF_REVIEW → MANAGER_REVIEW → REVIEWER_REVIEW → COMPLETED`.

### 7.3 Exit page → *Clearances waiting on me*
As a **department head** you see each leaver's NOC for your department — including the **assets they still hold** — and **Sign off** or **Reject** (with remarks). You may also **delegate** a clearance to a subordinate (`POST /exit/clearances/<id>/delegate`).

### 7.4 Approvals page → *My pending approvals*
Your inbox for anything the approval engine routes to you (resignations, onboarding sign-offs…). **Approve** or **Reject**; the underlying record updates automatically.

*How you become a manager:* the **project manager is assigned as the employee's reporting manager automatically on their first project allocation** — exactly as the business rule requires.

---

## 8. Projects & allocation (Admin/HR/Manager)

Create a project: **Name**, **Code** (unique, e.g. PRJ-001), **Client** (or *internal* for bench/initiatives), **Deployment location**, **Project manager**.

**Allocate** an employee with a **percentage** (100 = full time) and start date. The system rejects allocations that would push a person past 100% in total, and applies the manager-assignment rule above. Timesheets of type CLIENT reference these projects.

---

## 9. Exit management (HR + department heads)

The complete governed exit, in order:

1. **Employee submits resignation** (reason, requested last day) → employee becomes **ON_NOTICE**; the approval chain runs (e.g. reporting manager approves).
2. **HR accepts** and sets the **agreed last working day**.
3. **Start departmental NOCs** — one clearance per department, auto-assigned to each department head (delegable). Heads see held assets and sign off or reject.
4. When **all departments have signed off** → status **FNF**: HR records the **full & final settlement** (breakup + net payable).
5. **Release** — the **relieving letter PDF is generated automatically**, the F&F is marked settled, and the employee becomes **EXITED**.

Resignation statuses: `SUBMITTED → APPROVAL → ACCEPTED → CLEARANCE → FNF → RELEASED` (or `WITHDRAWN` / `REJECTED`). Clearance statuses: `PENDING → IN_PROGRESS → SIGNED_OFF / REJECTED`.

---

## 10. Approval engine (Admin/HR configuration)

On the **Approvals** page, define who approves what — per entity type (`RESIGNATION`, `ONBOARDING`, `TIMESHEET`, `OFFER`, `ALLOCATION`):

- Give the workflow a name and list the **steps in order**, one per line:
  - `REPORTING_MANAGER` — the subject's manager
  - `DEPARTMENT_HEAD` — the subject's department head
  - `DESIGNATION:HR Manager` — anyone holding that designation
  - `USER:<user-id>` — a named person
- Each approver can **Approve** (advances to the next step), **Reject** (ends the chain and updates the record), or **Delegate**.
- Every action is logged with actor, timestamp and comment.

---

## 11. BGC Vendor

Log in with the vendor account (role `BGC_VENDOR`). Vendors operate through the restricted vendor API:

- `GET /bgc/vendor/cases` — only the checks assigned to your agency, with the subject's name and employee code.
- `POST /bgc/vendor/cases/<id>/report` — submit the verdict (`CLEAR` / `DISCREPANCY` / `FAILED`), an uploaded report file, and remarks.

Vendors never see anything else in the tenant.

---

## 12. Everywhere features

- **Excel / PDF export** — every list table has **⬇ Excel** (downloads a real spreadsheet) and **⬇ PDF / Print** (opens a clean printable view; the browser's print dialog prints it or saves it as PDF). Exports contain exactly the rows loaded from the database.
- **Nothing is hardcoded** — every number, list and badge on every screen comes from the API and database.
- **Multi-tenancy** — all data is isolated per tenant; users of one company can never see another's data.
- **Files** — resumes, identity documents, interview screenshots, recordings, and generated letters are stored through the file service (S3-compatible storage when configured).

## 13. Status glossary

| Domain | Statuses |
|---|---|
| Application | APPLIED, SCREENING, INTERVIEW, SELECTED, OFFERED, OFFER_ACCEPTED, OFFER_DECLINED, ONBOARDING, HIRED, REJECTED, WITHDRAWN |
| Offer | DRAFT, SENT, ACCEPTED, DECLINED, WITHDRAWN |
| Onboarding | INVITED, IN_PROGRESS, DOCS_SUBMITTED, VERIFICATION, BGC, APPROVAL, COMPLETED |
| BGC | NOT_STARTED, SUBMITTED_TO_VENDOR, IN_PROGRESS, CLEAR, DISCREPANCY, FAILED |
| Employee | ONBOARDING, ACTIVE, ON_NOTICE, EXITED |
| Timesheet | DRAFT, SUBMITTED, APPROVED, DISCARDED |
| Appraisal | SELF_REVIEW, MANAGER_REVIEW, REVIEWER_REVIEW, COMPLETED |
| Resignation | SUBMITTED, APPROVAL, ACCEPTED, CLEARANCE, FNF, RELEASED, WITHDRAWN, REJECTED |
| Exit clearance | PENDING, IN_PROGRESS, SIGNED_OFF, REJECTED |
| Interview result | PENDING, PASSED, FAILED, NO_SHOW |

## 14. One complete story (hire to exit)

1. HR publishes *Senior Backend Engineer* on `/careers/sumaya-internal`.
2. Rahul applies with his CV and tags his skills. The parser (online or the 15-minute offline batch) fills his profile; the matcher scores him against all open roles.
3. HR runs a match on the job — Rahul is auto-shortlisted to SCREENING (past candidates would join as TALENT_POOL).
4. Two interview rounds are scheduled and passed — each saved with a recording link and the mandatory screenshot.
5. HR marks him SELECTED, creates and sends the offer (PDF letter generated). Rahul accepts.
6. Rahul's employee record is created automatically; he completes the onboarding portal (Aadhaar + PAN, skills, policy sign-off, password) and submits.
7. HR verifies his documents, submits his BGC to CheckPro (invisible to Rahul), and approves onboarding → ACTIVE.
8. He is allocated 50% to the Acme project — its manager becomes his reporting manager.
9. He submits weekly client timesheets; his manager approves them. He watches the mandatory security training end to end (no skipping possible) and passes the quiz. He gets recognized with *Star Performer*.
10. In the FY27 Q2 cycle he self-reviews; his manager reviews and rates him.
11. Years later he resigns: manager approves, HR accepts with a last working day, every department signs its NOC (his laptop and access card show on the checklist), HR records F&F, and the system generates his relieving letter as he becomes EXITED — while his profile and resume stay in the talent pool for the future.
