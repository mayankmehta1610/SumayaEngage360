# Global Jurisdiction and Mobility Flow

SumayaEngage360 supports country-aware recruitment and workforce mobility for the United States, United Kingdom, Canada, Australia, New Zealand, the European Union, the United Arab Emirates, Saudi Arabia, Qatar, Bahrain, Kuwait, and Oman.

This module is an operational workflow and evidence register. Immigration, employment, privacy, sponsorship, and tax rules change frequently; customers must validate decisions against the relevant authority and qualified local advisers.

## End-to-end operating model

1. A visitor selects the operating country on the public landing page. The selection is retained and passed into the company, agency, recruiter, or candidate sign-in journey.
2. A tenant administrator selects the organization's primary country and every country in which it operates.
3. SumayaEngage360 provisions the country-specific candidate fields, work-authorization types, evidence requirements, lifecycle stages, authority links, currency, and time zone.
4. An agency or company creates a client contact, recording its jurisdiction, registration/tax references, lifecycle status, and country-specific candidate requirements.
5. A recruiter creates or imports a candidate, obtains the appropriate privacy/processing basis, and completes the candidate's jurisdiction profile.
6. The recruiter validates identity and right-to-work evidence without treating a visa label alone as proof. Sensitive document values should be minimized and access-controlled.
7. If sponsorship or a permit is needed, the recruiter opens a work-authorization case, assigns the employer/client, selects the destination country and authorization type, and records expiry and renewal dates.
8. The case advances through controlled stages. Verification requires a method and evidence trail. Each change is tenant-scoped and auditable.
9. The candidate is submitted to the client with a compliance snapshot for that destination jurisdiction.
10. On placement, the contract, onboarding, payroll/deployment prerequisites, renewals, transfers, and eventual cancellation/termination are tracked through the same record.
11. The expiry dashboard highlights upcoming document and authorization deadlines across the tenant's operating countries.

## Country-specific flows

| Jurisdiction | Candidate profile and evidence | Authorization/sponsorship examples | Operational lifecycle |
| --- | --- | --- | --- |
| United States | Citizenship/immigration attestation, I-9 workflow, document verification method, SSN last four only where justified, worksite, SOC and wage context | U.S. citizen, permanent resident, EAD, H-1B/H-1B1, H-2A/H-2B, L-1A/L-1B, O-1, TN, E-3, E-1/E-2, F-1 CPT/OPT, J-1 | Requisition and worksite → candidate consent → offer → sponsorship/filing where required → I-9/E-Verify where applicable → onboarding → reverification/extension → transfer or separation |
| United Kingdom | Right-to-work share code, IDVT/ECS evidence and check date | Skilled Worker, Health and Care Worker, Global Business Mobility, Scale-up, Global Talent, Graduate, HPI, Youth Mobility, Temporary Worker, dependant routes | Sponsor/client requirement → offer and CoS where required → application → right-to-work check → start → repeat check/extension → change of employment or exit |
| Canada | Province, NOC/TEER, permit conditions and expiry | Citizen/PR, employer-specific permit, open permit, PGWP, IEC, study-linked work; LMIA and LMIA-exempt IMP pathways | Employer and province requirement → LMIA/offer submission where applicable → permit → SIN/payroll onboarding → condition/expiry monitoring → extension or change of employer |
| Australia | Visa conditions, occupation, location and VEVO verification | Citizen/PR, 482, 186, 494, 189, 190, 491, 485, 417, 462, student and partner work rights | Role/occupation assessment → sponsorship/nomination where required → visa → VEVO check → onboarding → condition monitoring → extension, permanent pathway or exit |
| New Zealand | Visa conditions, occupation and VisaView evidence | Citizen/resident, AEWV, open work, post-study, working holiday, seasonal pathways | Employer accreditation → job check where applicable → offer/visa → VisaView check → deployment → renewal, variation or exit |
| European Union | Destination member state, nationality, residence/work basis, GDPR lawful basis and retention | EU/EEA free movement, national permit, Single Permit, EU Blue Card, ICT, researcher/student, seasonal and temporary-protection routes | Select member state → establish privacy basis → employer/role eligibility → national filing → residence/work evidence → local registration/onboarding → renewal, mobility or departure |
| United Arab Emirates | Passport, sponsor/employer, job offer/contract, medical fitness, Emirates ID and residence status | Outside-country recruitment, transfer, family-sponsored work permit, temporary, mission, part-time, student, Golden/Green residence, freelance and domestic-worker pathways | Employer licence/quota → official job offer → work permit/entry authorization → medical → biometrics/Emirates ID → residence → payroll/deployment → renewal, transfer or cancellation |
| Saudi Arabia | Employer/sponsor, passport, profession, contract, medical and residency/work status | Employer-sponsored work authorization and applicable transfer/renewal routes | Employer eligibility/visa authorization → contract and entry → medical/biometrics → work permit and residence activation → deployment → renewal, transfer or final exit |
| Qatar | Employer/sponsor, contract, medical, residence/work status and national ID evidence | Employer-sponsored work/residence process and applicable transfer routes | Employer approval → entry/work authorization → medical/fingerprints → residence permit/QID → deployment → renewal, employer change or cancellation |
| Bahrain | Employer/sponsor, passport, contract, medical and permit evidence | LMRA employer-sponsored permits and eligible mobility/renewal routes | Employer application → permit/entry → medical and ID/residence steps → deployment → renewal, transfer or cancellation |
| Kuwait | Employer/sponsor, contract, entry visa, medical and civil/residence evidence | Private-sector work entry and residence process | Employer work authorization → entry visa → medical/security steps → residence/civil ID → deployment → renewal, transfer or cancellation |
| Oman | Employer/sponsor, occupation, labor clearance, medical and residence evidence | Employer-sponsored work visa and applicable renewal/transfer routes | Labor approval → work visa → arrival/medical → resident card and deployment → renewal, sponsor transfer or cancellation |

## Product surfaces and URLs

| Surface | URL | Purpose |
| --- | --- | --- |
| Public country selection | `/` | Select country before entering a company, agency, recruiter, or candidate workspace and preview its lifecycle. |
| Company/tenant sign-in | `/login/tenant?country=XX` | Enter the employer workspace with the selected country context. |
| Agency sign-in | `/login/agency?country=XX` | Enter the staffing/placement agency workspace with the selected country context. |
| Candidate sign-in | `/login/candidate?country=XX` | Enter the candidate workspace with the selected country context. |
| Global mobility workspace | `/global-mobility` | Configure operating countries, inspect requirements, complete candidate profiles, open cases, and manage verification/lifecycle stages. |
| Agency contacts | `/agency-contacts` | Manage client jurisdiction, registration/tax references, lifecycle, and candidate requirements. |
| Candidates | `/candidates` | Review candidates and their country-profile/work-authorization status. |
| Public jurisdiction API | `GET /api/jurisdictions/catalog` | Return the supported country catalog before authentication. |
| Tenant configuration API | `GET/PUT /api/jurisdictions/tenant` | Read or update enabled operating jurisdictions and generated field definitions. |
| Candidate profile API | `GET /api/jurisdictions/candidates/:candidateId` and `PUT /api/jurisdictions/candidates/:candidateId/profile` | Read and maintain country-specific candidate requirements. |
| Authorization case API | `GET/POST /api/jurisdictions/work-authorizations` and `PATCH /api/jurisdictions/work-authorizations/:id` | Create, review, verify, renew, transfer, close, or cancel authorization cases. |
| Expiry API | `GET /api/jurisdictions/expiry-dashboard` | Surface expiring authorizations and follow-up dates. |

`XX` is the selected country code, for example `US`, `GB`, `CA`, `AU`, `NZ`, `EU`, `AE`, `SA`, `QA`, `BH`, `KW`, or `OM`.

## Roles and controls

- Platform administrators provision tenants and their primary/operating countries.
- Tenant administrators maintain country configuration and field definitions.
- HR and recruitment managers maintain candidate profiles and authorization cases.
- Agency users maintain country-specific client contacts, requirements, submissions, and placements.
- Candidates see and provide only their own requested profile/evidence through the candidate-facing workflow.
- Tenant isolation, role checks, country enablement, allowed status transitions, and verification evidence are enforced by the API.

## Authoritative references

- United States: USCIS Form I-9 and temporary worker classifications.
- United Kingdom: GOV.UK right-to-work checks and work visa guidance.
- Canada: IRCC work permits, employer-specific permits, LMIA and LMIA-exempt employer processes.
- Australia: Department of Home Affairs employer sponsorship options and VEVO.
- New Zealand: Immigration New Zealand employer guidance, AEWV and VisaView.
- European Union: EU Immigration Portal and each destination member state's competent authority.
- United Arab Emirates: UAE Government, MoHRE, ICP and, where applicable, GDRFA.
- Saudi Arabia: Ministry of Human Resources and Social Development.
- Qatar: Ministry of Labour and Ministry of Interior services.
- Bahrain: Labour Market Regulatory Authority.
- Kuwait: official government work-entry and residence services.
- Oman: official government work visa and labour services.
