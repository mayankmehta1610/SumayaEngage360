# Tenant Types — SumayaEngage360

Multi-tenant-type platform specification. Every tenant is provisioned with a **tenant type** that drives enabled portals, navigation, and primary workflows.

## Supported tenant types

| Type | Enum | Primary use case | Default portals |
|------|------|------------------|-----------------|
| **Company** | `COMPANY` | Full employee lifecycle (hire → exit) | `ats`, `workforce`, `operations`, `compensation`, `performance` |
| **Recruitment agency** | `RECRUITMENT_AGENCY` | Candidate pool, client submissions, contact CRM | `ats`, `agency` |
| **Staffing company** | `STAFFING_COMPANY` | Contract management, contractor assignments | `ats`, `staffing`, `operations` |
| **Individual recruiter** | `INDIVIDUAL_RECRUITER` | Lighter agency flow (single recruiter) | `ats`, `agency` |

Existing tenants default to `COMPANY` for backward compatibility.

## Schema

- `Tenant.tenantType` — `TenantType` enum (default `COMPANY`)
- `Tenant.onboardingQuestionnaire` — JSON answers from provisioning wizard
- `Tenant.enabledPortals` — JSON array of portal keys (`ats`, `agency`, `staffing`, `workforce`, …)

## Onboarding wizard

**Platform admin** (`POST /tenants`): create tenant with `tenantType`, `enabledPortals`, `onboardingQuestionnaire`.

**Tenant admin** (self-serve after first login):

- `GET /tenant/me` — current tenant profile
- `POST /tenant/onboarding-wizard` — set type + portals + questionnaire
- `PATCH /tenant/onboarding` — merge questionnaire / portal changes

Web: **Tenants** page (platform admin) — 2-step wizard: (1) tenant type, (2) portal checkboxes + admin user.

## Rich application profile

`ApplicationProfile` (1:1 with `Application`):

- `professionalSummary`, `domainExpertise[]`, `education` (JSON), `coverLetterFileId`, `contacts` (JSON), `customFields` (JSON)

API:

- `GET /applications/:id/profile`
- `POST /applications/:id/profile` — upsert

Web: **Applications** detail tabs — Personal | Professional | Skills | Experience | Education | Documents | Contacts | Custom fields | Pipeline.

## Configurable custom fields

`TenantFieldDefinition` per tenant:

- `entity` (`APPLICATION`, `CANDIDATE`), `fieldKey`, `label`, `type`, `required`, `options`

API: `GET/POST /tenant-field-definitions`, `GET /tenant-field-definitions/entity/:entity`

## Agency CRM (recruitment agency / individual recruiter)

- `AgencyClientSubmission` — submit candidates to clients/jobs
- `AgencyContact` — client / hiring manager / vendor contacts

API:

- `GET/POST /agency/submissions`, `PATCH /agency/submissions/:id`
- `GET/POST/PATCH /agency/contacts`
- `GET /agency/clients` — hiring clients as agency client list

## Staffing (staffing company)

- `ContractorAssignment` — contractor lifecycle on contracts
- Reuses `ProjectContract` for `/contracts`

API:

- `GET/POST /contracts`
- `GET/POST/PATCH /contractors`

## Navigation & RBAC

Shell navigation filters routes by `enabledPortals` (from `GET /tenant/me`). Agency and Staffing nav groups appear only when the corresponding portal is enabled.

## Pagination envelope

List endpoints return:

```json
{
  "data": [],
  "meta": {
    "total": 0,
    "page": 1,
    "pageSize": 25,
    "totalPages": 1,
    "sortBy": "createdAt",
    "sortDir": "desc"
  }
}
```

Query params: `page`, `pageSize`, `sortBy`, `sortDir`, `search`, `filter` (JSON), multi-value filters via repeated keys.

## Gap closure status (2026-07-12)

All tenant-type expansion gaps are implemented:

| Gap | Status |
|-----|--------|
| Pagination envelope on list APIs | Core ATS, workforce, agency, staffing, audit, onboarding, and tenant-field-definitions endpoints return `{ data, meta }` with `page`, `pageSize`, `sortBy`, `sortDir`, `search`, `filter`. Web data-tables on employees, users, jobs, candidates, applications, audit, onboarding, contractors, contracts, agency submissions/contacts use server-side paging. |
| Self-serve onboarding wizard | `/tenant-onboarding` — tenant admin configures type, portals, questionnaire via `POST /tenant/onboarding-wizard`. Linked from Settings. |
| Custom field admin UI | Settings → Custom field definitions — CRUD via `/tenant-field-definitions`. |
| Applications detail | Agency submissions tab; resume/cover letter upload via `/files` + candidate/profile APIs. |
| Staffing contractor dropdowns | Contractors form loads employees, candidates, contracts from API. |
| Cross-tenant agency | `GET /agency/client-tenants` + client tenant picker on submissions (and application detail tab). |
| Playwright ui-full | 6/6 lifecycle tests with `e360-select-field` helpers. |

## Migration

`20260712180000_tenant_types_expansion`
