# SumayaEngage360 functional completion plan

This is the implementation control document for turning the feature catalogue into connected, production-style workflows. A module is not complete because its route renders; it is complete only when required fields are captured, records persist, tenant and role boundaries are enforced, downstream records are created or linked, and the workflow is covered by automated verification.

## Dependency order

1. **Platform and organization foundation** — tenant type, legal entities, locations, business units, cost centers, grades, employment types, departments, designations, reporting lines, holiday calendars, job descriptions, users, roles, and tenant settings.
2. **Plan to hire** — manpower requisition, approval, ATS job creation, client and placement-agency ownership, job publishing, candidate sourcing, applications, screening, interviews, offer, preboarding, background verification, and onboarding.
3. **Workforce operations** — employee master, personal data, documents, skills, projects, contracts, rate cards, allocation, bench, attendance, shifts, leave, timesheets, assets, training, compliance, and exit.
4. **Compensation and performance** — salary structures, payroll calendars and runs, adjustments, tax declarations, payslips, benefits, expenses, goals, KPIs, competencies, appraisals, calibration, recognition, feedback, and surveys.
5. **Control plane** — workflow versions, delegations, approvals, notifications, audit, privacy, scheduled jobs, reports, exports, feature catalogue evidence, and role-specific navigation.
6. **Channel parity** — employee and manager web journeys, candidate/public journeys, placement-agency journeys, BGV vendor journeys, and the Flutter mobile application.

## End-to-end invariants

- Every business record is tenant-scoped on reads and writes; foreign IDs are verified against the same tenant before use.
- Users select real master or transaction records. Screens must not require users to type internal UUIDs.
- API DTOs declare every supported field so validation never silently drops user input.
- Financial totals are calculated by the server from line items; clients do not supply trusted totals.
- State transitions are explicit and reject invalid or repeated transitions.
- A transition that creates dependent records is transactional. For example, manpower approval creates and links one ATS job or creates neither.
- Employee, manager, department, project, client, candidate, and job relationships are reused across modules rather than copied into disconnected text fields.
- Empty-state demo data must follow the same API and database rules as real data.

## Current repair ledger

| Area | Completed in current repair | Remaining completion gate |
|---|---|---|
| Organization masters | Legal entity country/tax ID; location city/country; grade level; holiday calendars and job descriptions with edit/deactivate | Connect every employee, job, payroll, leave, and reporting filter to these masters |
| Manpower | Full requisition details; department, location, employment type, experience, skills, budget, justification; approval transaction creates linked ATS job | Approval policies, rejection reason, amendment/version history, requester and approver views |
| Employee master | Department/designation/manager/location/password entry; same-tenant relationship validation | Full edit experience, effective-dated job history, bulk import and validation report |
| Preboarding | Named employee selector, custom/default tasks, due dates, tenant-safe employee validation | Assignee selection, reminders, task dependencies, document and BGV readiness gates |
| Expenses | Multiple dated categorized lines, descriptions, receipt reference, server totals, transition checks | Receipt upload control, policy limits, approver/rejection evidence, payroll/reimbursement posting |
| Benefits | Description/category entry, enrollment, end enrollment, plan deactivation | Eligibility windows, employee elections, dependents, payroll deduction linkage |
| Payroll | Frequency/pay day, overlap validation, salary components plus payroll adjustments, loan/advance recovery | Attendance/leave proration, statutory country rules, review/lock/approve/post states, downloadable payslip |
| Goals | KPI units, competencies, templates, cycle/due date/target, exact progress | Weighted goals, approval, check-ins, appraisal and calibration linkage |
| Assets | Category, model, serial number, employee assignment and return condition | Edit/retire/lost states, warranty and purchase data, exit-clearance enforcement |

## Workflow acceptance suites to add

1. Tenant admin configures organization masters, department, designation, users, and role assignments.
2. Manager submits manpower requisition; HR approves; one linked draft job appears with matching headcount, description, location, budget, experience, and skills.
3. Recruiter publishes the job, sources a candidate, advances the application through interviews and offer, and creates preboarding/onboarding records without re-entering identity data.
4. HR activates the joiner; the employee appears in reporting lines, project allocation, leave, timesheet, payroll, benefits, expenses, goals, training, assets, compliance, and exit selectors.
5. Placement agency sees only its submissions and contacts; client-company and internal-recruitment records remain separated.
6. Employee submits leave, timesheet, expense, tax declaration, goal progress, training, survey, privacy, and exit requests; the correct manager or administrator sees and completes each approval.
7. Payroll uses the effective salary structure and approved period inputs, produces immutable payslips, and exposes only the employee's own slips.
8. Exit blocks final completion until assets, access, finance, leave, timesheet, and department clearances are resolved.
9. Reports reconcile to transactional data and export the same filtered result in CSV, spreadsheet, and PDF formats.
10. A second tenant cannot read or reference any first-tenant record, including by guessed IDs.
