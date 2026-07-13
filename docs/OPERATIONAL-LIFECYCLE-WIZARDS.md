# Operational lifecycle wizards

The operational lifecycle engine replaces isolated status labels and shallow checklist forms with persisted, tab-based workflows. Each workflow is linked to its real source record, remains tenant-scoped, and records structured data, assigned work, documentation, ownership, due dates, blockers, progress, and activity history.

## Shared interaction model

Every embedded wizard contains:

- A lifecycle progress header with overall completion, required work, verified documents, blockers, owner, priority, and target date.
- Horizontal stage tabs showing completion and blocked status.
- An Overview tab for stage ownership, due date, notes, progress and case controls.
- A Data & tasks tab containing domain-specific fields, responsible role/person, evidence notes, due dates and controlled completion states.
- A Documents tab showing assigned, requested, received, under-review, verified, rejected, waived and expired states.
- Document upload, official reference, issue date, expiry date, owner, rejection reason, and verification notes.
- A History tab for the auditable case timeline.
- Previous/next navigation while completion is calculated from required tasks and documents rather than manually entered percentages.
- Case-specific task and document assignment when a standard template needs an exception.

Required structured fields must be completed before a task can be closed. A rejected document requires a correction reason. A document cannot be verified without an uploaded file or official reference.

## Module-by-module workflow

### Candidate intake

Embedded in `/candidates`.

1. Identity & contact: legal/preferred name, email, phones, location, date of birth where justified, identity/address evidence.
2. Communication & consent: channel, contact time, privacy notice, talent-community consent and source.
3. Professional profile: headline, employer/title, experience, industry, summary, skills, certifications and languages.
4. Employment preferences: permanent/contract type, work mode, locations, availability, notice and compensation expectations.
5. Eligibility & mobility: work countries, authorization, sponsorship, relocation, travel, conflicts and accommodations.
6. Quality review: duplicates, source verification, ownership, profile/document/consent checks and matching readiness.

### Application-to-hire

Embedded in `/applications`.

1. Application: source, applied role/location, notice, salary expectation, resume, cover letter and portfolio.
2. Screening: minimum criteria, recruiter screen, motivation, communication, compensation alignment and manager decision.
3. Interviews: interview plan, panel, candidate availability, accommodations, scorecard closure, strengths, risks and decision.
4. Offer: designation, department, manager, location, employment type, joining, probation, compensation, approvals and negotiation.
5. Preboarding: joining confirmation, release, background check, work authorization and required evidence.
6. Hire conversion: employee code, actual joining, no-show outcome, source closure and onboarding handoff.

### Agency submission and placement

Embedded in `/agency/submissions`.

1. Client intake: legal entity/contact, vacancy, location, type, budget/rate, deadline, must-have criteria and commercial terms.
2. Candidate clearance: representation consent, exclusivity, availability, expected pay/rate, work-right and duplicate checks.
3. Submission: submission owner/date, rate, candidate summary, compliance snapshot and client acknowledgement.
4. Client process: shortlist/interview/selection state, schedule, feedback, next action and next-action date.
5. Placement: permanent/contract type, start, pay, bill rate, fee type, invoice trigger, guarantee period and confirmation.

### Global mobility and work authorization

Embedded in `/global-mobility` for every supported operating country.

1. Eligibility: destination, route, sponsor, employer, role, occupation code, worksite, salary, sponsorship and assessment outcome.
2. Documents: candidate/employer owners, filing target, translation, attestation and assigned identity, qualification, employment, employer and dependant records.
3. Sponsorship/filing: sponsor reference, application number, filing authority/date, fees, processing type, biometrics, medical and decision target.
4. Verification: official decision, validity, expiry, verification method/reference, restrictions and reverification date.
5. Deployment: travel, local registration/ID, payroll, insurance, manager confirmation and local orientation.
6. Renewal/closure: next review, renewal start, material changes, transfer/permanent/expiry/cancellation outcome and record retention.

### Employee onboarding

Embedded in `/onboarding`.

1. Personal profile: identity, contact, addresses and emergency contact.
2. Employment setup: legal entity, organization, position, grade, manager, work arrangement, dates and cost center.
3. Checks & documents: BGV package/vendor, component results, work rights, exceptions and evidence.
4. Payroll & benefits: bank/tax/statutory profile, pay group/frequency, compensation, benefits and dependants.
5. Access & equipment: corporate identity, system access, MFA, security training, workplace, assets and manager readiness.
6. Induction: orientation, buddy, team, policies, mandatory learning, first-week plan and initial goals.
7. Activation: final HR/manager checks and controlled activation readiness.

### Active employee lifecycle

Embedded in `/employees`.

1. Employment: legal entity, department, designation, grade, manager, location, work mode, type and effective dates.
2. Pay & benefits: compensation, review dates, payroll, tax, bank and benefit validity.
3. Performance: cycle, goals, check-ins, status and manager notes.
4. Learning & career: strengths, gaps, actions, mandatory learning, career/internal mobility and succession readiness.
5. Time, leave & assets: shift, leave calendar, timesheet, projects, assets and operational issues.
6. Compliance & changes: policies, work authorization, personal data, conflicts, employee-relations matters and next review.

### Contractor assignment

Embedded in `/contractors`.

1. Requirement: client, role, location, work mode, dates, skills, hours and rate.
2. Compliance: identity, work rights, BGV, insurance and client training.
3. Contract: worker/client terms, pay/bill rates, overtime, payment, notice, approvals and purchase order.
4. Deployment: client manager, access, assets, induction and actual start.
5. Time & delivery: timesheet approval, billing, performance, extension decision and issues.
6. Offboarding: last day, time, access, assets, invoice, feedback and redeployment.

### Exit and settlement

Embedded in `/exit`.

1. Exit request: type, reason, dates, notice, risk and confidentiality.
2. Approval & dates: manager decision, retention outcome, notice waiver/recovery, final date and communication.
3. Handover: recipient, projects, documents, clients, open risks and acceptance.
4. Clearances: manager, IT, access, assets, finance, administration and HR.
5. Settlement: salary, leave, variable pay, notice/asset recovery, tax, net payable, currency and payment.
6. Closure & alumni: access revocation, exit interview, rehire eligibility, alumni consent, record closure and final letters.

## Persistence and controls

The database uses `LifecycleCase`, `LifecycleStage`, `LifecycleTask`, `LifecycleDocument`, and `LifecycleActivity`. The source entity remains the system of record and the lifecycle holds the cross-module operational work around it.

- `TENANT_ADMIN`, `HR`, and `MANAGER` can create and maintain lifecycle cases according to their module access.
- Interviewers can read lifecycle definitions/details required for their assigned work but cannot create or mutate lifecycle records.
- Every entity is validated inside the current tenant before a lifecycle can be created.
- Progress is server-calculated from required tasks and documents.
- Blocked tasks and rejected/expired documents block the case.
- Completion advances the next incomplete stage and records timestamps.
- Sensitive identifiers should be masked and full files stored through the controlled file repository.
