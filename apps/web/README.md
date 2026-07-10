# Engage360 Web (Angular)

Angular workspace serving three surfaces from one app:

- **Public careers pages** — `/{clientSlug}/careers` — open roles with JD, vacancies,
  location; application form with resume upload and mandatory skill tagging.
- **Admin portal** — tenant admins/HR: hiring clients, jobs, applications pipeline,
  interview rounds (recording + screenshot upload), offers, onboarding verification,
  employees, projects, appraisal configuration, exit clearances.
- **Employee portal** — profile, documents, timesheets, trainings (locked no-skip
  video player), recognition feed, feedback, resignation and exit tracking.

## Setup

This scaffold contains the app shell; generate the full workspace on first setup:

```bash
npm install -g @angular/cli
ng new engage360 --directory . --routing --style=scss --standalone --skip-git
npm start
```

Point the API base URL in `src/environments/` at the NestJS API (default `http://localhost:3000/api`)
and send the tenant subdomain via the `x-tenant-id` header in development.

## Structure (planned)

```
src/app/
  core/          auth interceptor, tenant resolver, API client
  public/        careers pages (SSR-able)
  admin/         ATS + HR admin features
  employee/      employee self-service
  shared/        UI components (locked video player, approval widgets)
```
