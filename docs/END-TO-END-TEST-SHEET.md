# SumayaEngage360 — Complete End-to-End Test Sheet

Everything you need to test all 13 country demo companies across **every role**,
plus the company intranet. Seeded by `seed-global-demo.mjs` (companies + ATS)
and `seed-full-roles.mjs` (all roles + intranet). Idempotent — safe to re-run.

- **Web:** https://engage360-web.onrender.com
- **API:** https://engage360-api-qhnr.onrender.com/api
- **Every demo password:** `Demo@12345`
- First request after idle may take ~30–60s (free tier spins down).

---

## 1. The 13 companies

| # | Country | Company | Company login URL | Org ID |
|---|---|---|---|---|
| 1 | 🇮🇳 India | Meridian Infotech | `/in/company/meridian-in` | `meridian-in` |
| 2 | 🇺🇸 USA | Blue Harbor Software | `/us/company/blueharbor-us` | `blueharbor-us` |
| 3 | 🇬🇧 UK | Thistle & Crown Consulting | `/gb/company/thistlecrown-gb` | `thistlecrown-gb` |
| 4 | 🇨🇦 Canada | Northlight Systems | `/ca/company/northlight-ca` | `northlight-ca` |
| 5 | 🇦🇺 Australia | Wattle Digital | `/au/company/wattle-au` | `wattle-au` |
| 6 | 🇳🇿 New Zealand | Kauri Cloudworks | `/nz/company/kauri-nz` | `kauri-nz` |
| 7 | 🇦🇪 UAE | Falcon Gate Group | `/ae/company/falcongate-ae` | `falcongate-ae` |
| 8 | 🇸🇦 Saudi Arabia | Qimam Talent Co | `/sa/company/qimam-sa` | `qimam-sa` |
| 9 | 🇶🇦 Qatar | Pearl Bay Services | `/qa/company/pearlbay-qa` | `pearlbay-qa` |
| 10 | 🇧🇭 Bahrain | Manama Bridge Solutions | `/bh/company/manamabridge-bh` | `manamabridge-bh` |
| 11 | 🇰🇼 Kuwait | Gulf Anchor Trading | `/kw/company/gulfanchor-kw` | `gulfanchor-kw` |
| 12 | 🇴🇲 Oman | Muscat Peak Technologies | `/om/company/muscatpeak-om` | `muscatpeak-om` |
| 13 | 🇪🇺 EU | Europa Talent Partners | `/eu/company/europa-eu` | `europa-eu` |

Open the **company login URL**; the Organization ID is pre-filled and the page
shows the real company name ("Sign in to Meridian Infotech"). Then use any email
below with password `Demo@12345`.

---

## 2. Every role, in every tenant

Replace `<org>` with the Org ID (e.g. `meridian-in`). **All passwords: `Demo@12345`.**

| Role | Email | What they can do |
|---|---|---|
| **Tenant admin** | `admin@<org>.demo` | Everything: settings, branding, users, ATS, workforce, payroll, intranet publish + moderate |
| **HR** | `hr@<org>.demo` | ATS, employees, payroll, intranet publish + **reviews Talent & People content** |
| **Manager** | `manager@<org>.demo` | Team views, approvals, timesheets, projects |
| **Employee** | `employee@<org>.demo` | Self-service (leave, payslips, profile) + **contributes intranet content for review** |
| **Department head** | `depthead@<org>.demo` | Head of Corporate Communications; **reviews content submitted in their department** |
| **Interviewer** | `interviewer@<org>.demo` | Assigned interviews, candidate review |
| **BGV vendor** | `bgc@<org>.demo` | Background-check cases only (lands on `/bgc-vendor`) |

Example — India (Meridian Infotech):
`admin@meridian-in.demo`, `hr@meridian-in.demo`, `manager@meridian-in.demo`,
`employee@meridian-in.demo`, `depthead@meridian-in.demo`,
`interviewer@meridian-in.demo`, `bgc@meridian-in.demo`.

Platform operator (provisions tenants): `/login/platform` →
`admin@engage360.com` / `Admin@12345`.

---

## 3. The intranet (company-specific)

Sign in to any tenant → **Intranet** in the sidebar. It is scoped to that
company only. Each tenant is seeded with:

- Department hub: **Corporate Communications**
- Categories: **Announcements** (reviewed by the department head) and
  **Talent & People** (reviewed by HR)
- A published **"Welcome to our intranet"** article (featured on the home page)
- Two drafts **pending review** (submitted by the employee)

### End-to-end intranet test (the moderation flow)

1. **As `employee@<org>.demo`** → Intranet → **Contribute content** → write an
   article in a department category → **Submit for review**. It becomes
   *Pending review* (employees cannot publish directly).
2. **As `depthead@<org>.demo`** → Intranet → **Review queue (N)** → you'll see
   the "Team offsite recap" draft (Announcements) → **Approve & publish** or
   **Return for changes** (with a reason).
3. **As `hr@<org>.demo`** → Intranet → **Review queue** → you'll see the
   "Proposal: new referral program" draft (Talent & People, HR-reviewed) →
   approve/return.
4. **As `admin@<org>.demo`** → Intranet → **Manage & publish** → create
   categories (up to 3 levels), set who-can-see and **who reviews** each
   category, upload documents/videos/posters, manage banners.

---

## 4. The ATS pipeline (recruitment → employee)

1. **Public careers page** (no login): `/careers/<org>/<org>` — e.g.
   `/careers/meridian-in/meridian-in`. Seeded jobs in real local cities.
2. **Apply**: upload a resume → the form **auto-fills** (name, email, phone,
   city, skills, experience, education) from our in-house parser.
3. **As `hr@<org>.demo`** → Applications → move a candidate through
   screening → interviews → **Selected** → create & send an **Offer**.
4. The candidate accepts (offer email links) → they are **converted to an
   Employee** automatically (login, employee record, skills, salary structure,
   onboarding case, and their structured location — which drives India
   professional tax for `meridian-in`).

---

## 5. Country-specific things to spot-check

- **India (`meridian-in`)**: Payroll → India statutory calculator (PF/ESI/PT/TDS);
  process a payroll run and see PF/PT auto-deducted using the employee's city.
- **Any tenant**: Global mobility shows that country's work-authorization types;
  location pickers offer only that country's states/cities (country is fixed by
  the workspace, not a dropdown).
- **Audit trail** (`admin`/`hr`): every change is logged with actor, IP and
  **device type** (mobile/tablet/desktop).
