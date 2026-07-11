import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  // Public marketing/landing page
  { path: '', pathMatch: 'full', loadComponent: () => import('./pages/landing.component').then((m) => m.LandingComponent) },
  { path: 'login', loadComponent: () => import('./pages/login.component').then((m) => m.LoginComponent) },
  // Public, company-scoped careers pages: /careers/<company>/<client-page>.
  // The company is part of the URL, so a link always shows exactly one
  // tenant's data no matter who opens it.
  { path: 'careers/:tenant/:slug', loadComponent: () => import('./pages/careers.component').then((m) => m.CareersComponent) },
  // Legacy single-segment link (pre-tenant-scoped URLs)
  { path: 'careers/:slug', loadComponent: () => import('./pages/careers.component').then((m) => m.CareersComponent) },
  // Secure onboarding portal, company-scoped: /onboarding/<company>/<token>
  { path: 'onboarding/:tenant/:token', loadComponent: () => import('./pages/onboarding-portal.component').then((m) => m.OnboardingPortalComponent) },
  { path: 'onboarding/:token', loadComponent: () => import('./pages/onboarding-portal.component').then((m) => m.OnboardingPortalComponent) },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard.component').then((m) => m.DashboardComponent) },
      { path: 'profile', loadComponent: () => import('./pages/profile.component').then((m) => m.ProfileComponent) },
      { path: 'users', loadComponent: () => import('./pages/users.component').then((m) => m.UsersComponent) },
      { path: 'candidates', loadComponent: () => import('./pages/candidates.component').then((m) => m.CandidatesComponent) },
      { path: 'recognition', loadComponent: () => import('./pages/recognition.component').then((m) => m.RecognitionComponent) },
      { path: 'clients', loadComponent: () => import('./pages/clients.component').then((m) => m.ClientsComponent) },
      { path: 'jobs', loadComponent: () => import('./pages/jobs.component').then((m) => m.JobsComponent) },
      { path: 'applications', loadComponent: () => import('./pages/applications.component').then((m) => m.ApplicationsComponent) },
      { path: 'onboarding', loadComponent: () => import('./pages/onboarding.component').then((m) => m.OnboardingComponent) },
      { path: 'employees', loadComponent: () => import('./pages/employees.component').then((m) => m.EmployeesComponent) },
      { path: 'org', loadComponent: () => import('./pages/org.component').then((m) => m.OrgComponent) },
      { path: 'projects', loadComponent: () => import('./pages/projects.component').then((m) => m.ProjectsComponent) },
      { path: 'timesheets', loadComponent: () => import('./pages/timesheets.component').then((m) => m.TimesheetsComponent) },
      { path: 'appraisals', loadComponent: () => import('./pages/appraisals.component').then((m) => m.AppraisalsComponent) },
      { path: 'trainings', loadComponent: () => import('./pages/trainings.component').then((m) => m.TrainingsComponent) },
      { path: 'exit', loadComponent: () => import('./pages/exit.component').then((m) => m.ExitComponent) },
      { path: 'approvals', loadComponent: () => import('./pages/approvals.component').then((m) => m.ApprovalsComponent) },
      { path: 'tenants', loadComponent: () => import('./pages/tenants.component').then((m) => m.TenantsComponent) },
    ],
  },
  { path: '**', redirectTo: '' },
];
