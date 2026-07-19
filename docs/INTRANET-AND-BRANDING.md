# Company Intranet, Tenant Branding & Audit Device Capture

**Added:** 2026-07-19

## 1. Company intranet (SharePoint-style publishing portal)

Tenant-scoped intranet at **`/intranet`** (web) backed by the `intranet` API module.

### Structure

- **Department hubs** — every `Department` gets a hub page automatically.
- **Categories** — up to **3 levels** (category → sub-category → sub-sub-category) per
  department. Depth is enforced server-side (`MAX_CATEGORY_DEPTH = 3`).
- **Content** — five types: `ARTICLE` (rich body), `DOCUMENT`, `VIDEO`, `POSTER`
  (uploaded assets), `LINK` (external URL). Content lives in a department and
  optionally a category, and can carry tags, a cover image and an expiry date.
- **Banners** — rotating hero banners at three placements: company-wide (home
  page), per department hub, per category. Scheduling via `startsAt`/`endsAt`.

### Publishing workflow

`DRAFT → PENDING_REVIEW → PUBLISHED → ARCHIVED`
(`submit`, `publish`, `unpublish`, `archive` endpoints). Readers only ever see
`PUBLISHED`, non-expired items.

**Who can publish:** `TENANT_ADMIN` and `HR` anywhere; `DEPARTMENT_HEAD` within
their own department only.

### Security levels

Per category and per content item (`accessLevel`):

| Level | Visible to |
|---|---|
| `COMPANY` | everyone in the tenant |
| `DEPARTMENT` | members of the owning department |
| `ROLES` | roles listed in `allowedRoles` |
| `PRIVATE` | author + HR/tenant admin |

**Download control:** `downloadable=false` makes an asset view-online-only — the
`/download` endpoint returns 403 while inline viewing (`/file`) still works.
Enforced server-side, surfaced with a lock badge in the UI.

### Storage

All assets go through the existing `FilesService`, so storage is configurable by
environment only — **local disk** by default, **S3 / R2 / B2** when `S3_BUCKET`
(+ `S3_ENDPOINT`, keys) is set. Moving intranet assets to S3 later requires **no
code change**.

### Key endpoints (all tenant-scoped, authenticated)

```
GET    /intranet/home                      aggregate: banners, hubs, pinned, recent
GET    /intranet/departments/:id/categories  3-level tree (access-filtered)
POST   /intranet/categories                + PATCH/DELETE /intranet/categories/:id
GET    /intranet/content                   filters: departmentId, categoryId, type, status, q
POST   /intranet/content                   + PATCH/DELETE /intranet/content/:id
POST   /intranet/content/:id/{submit|publish|unpublish|archive}
GET    /intranet/content/:id/file          inline view (videos, posters, docs)
GET    /intranet/content/:id/download      403 when downloadable=false
GET    /intranet/banners (+ CRUD)          ?all=true for manage view
```

## 2. Tenant branding (self-service CMS)

Tenant admins change their **logo, brand colors and tagline** under
**Settings → Company branding** — applied instantly to the whole workspace for
every user in that tenant (shell logo, nav accent, buttons, gradients via CSS
variable overrides).

```
GET   /tenant/branding    readable by all signed-in users (shell theming)
PATCH /tenant/branding    TENANT_ADMIN only; '' clears a value
GET   /tenant/logo        streams the uploaded logo
```

Tenant columns added: `logoFileId`, `brandPrimaryColor`, `brandAccentColor`,
`brandTagline` (migration `20260719100000_intranet_branding_audit_device`).

## 3. Audit trail — device capture

Every mutating API call is auto-audited (global `AuditInterceptor`). Now also
records **which device** made the change:

- `userAgent` — raw client user-agent string
- `deviceType` — parsed `MOBILE | TABLET | DESKTOP | API`

The audit page (`/audit`) shows Device and Source IP columns; device is
filterable. India (IN) remains the default jurisdiction (tenant default country
`IN`, currency `INR`, `Asia/Kolkata`) with the full India entry in the
jurisdiction catalog (CIN/LLPIN, GSTIN, EPFO/ESIC, FRRO checks…).

## 4. Known gaps / next steps

- Mobile (Flutter) parity for the intranet module is **not yet built** — web only.
- Publishing review flow is single-step (`PENDING_REVIEW` → publisher approves);
  no multi-stage approval chain yet.
- View-only enforcement is server-side download blocking; it does not prevent
  screenshots or browser save of inline-rendered media (DRM out of scope).
