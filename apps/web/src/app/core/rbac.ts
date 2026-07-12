/**
 * RBAC matrix — maps modules/routes to allowed roles.
 * Platform access is granted explicitly per route, never as a tenant-role bypass.
 *
 * Roles: PLATFORM_ADMIN | TENANT_ADMIN | HR | MANAGER | EMPLOYEE |
 *        INTERVIEWER | BGC_VENDOR | DEPARTMENT_HEAD
 */
export type AppRole =
  | 'PLATFORM_ADMIN'
  | 'TENANT_ADMIN'
  | 'HR'
  | 'MANAGER'
  | 'EMPLOYEE'
  | 'INTERVIEWER'
  | 'BGC_VENDOR'
  | 'DEPARTMENT_HEAD';

export type TenantType =
  | 'COMPANY'
  | 'RECRUITMENT_AGENCY'
  | 'STAFFING_COMPANY'
  | 'INDIVIDUAL_RECRUITER';

/** Portal keys used to show/hide nav groups per tenant type. */
export const ROUTE_PORTAL: Record<string, string> = {
  '/clients': 'ats',
  '/jobs': 'ats',
  '/candidates': 'ats',
  '/applications': 'ats',
  '/employees': 'workforce',
  '/onboarding': 'workforce',
  '/preboarding-admin': 'workforce',
  '/org': 'workforce',
  '/exit': 'workforce',
  '/projects': 'operations',
  '/manpower': 'operations',
  '/assets': 'operations',
  '/leave': 'operations',
  '/timesheets': 'operations',
  '/payroll': 'compensation',
  '/benefits': 'compensation',
  '/expenses': 'compensation',
  '/goals': 'performance',
  '/appraisals': 'performance',
  '/trainings': 'performance',
  '/recognition': 'performance',
  '/surveys': 'performance',
  '/agency/submissions': 'agency',
  '/agency/contacts': 'agency',
  '/contracts': 'staffing',
  '/contractors': 'staffing',
};

export const TENANT_TYPE_DEFAULT_PORTALS: Record<TenantType, string[]> = {
  COMPANY: ['ats', 'workforce', 'operations', 'compensation', 'performance'],
  RECRUITMENT_AGENCY: ['ats', 'agency'],
  STAFFING_COMPANY: ['ats', 'staffing', 'operations'],
  INDIVIDUAL_RECRUITER: ['ats', 'agency'],
};

export const TENANT_TYPE_LABELS: Record<TenantType, string> = {
  COMPANY: 'Company (hire-to-exit)',
  RECRUITMENT_AGENCY: 'Recruitment agency',
  STAFFING_COMPANY: 'Staffing company',
  INDIVIDUAL_RECRUITER: 'Individual recruiter',
};

/**
 * Business segments — each gets its own branded login URL (/login/:segment),
 * landing entry point, and post-login workspace.
 */
export interface Segment {
  key: string;
  tenantType: TenantType | null; // null = platform operator
  label: string;
  shortLabel: string;
  tagline: string;
  icon: string;
  /** CSS var suffix for the segment accent (see styles.css --e360-seg-*) */
  accent: string;
  /** Headline workflow steps shown on login/landing */
  workflow: string[];
  /** Route to land on after login */
  home: string;
}

export const SEGMENTS: Segment[] = [
  {
    key: 'company',
    tenantType: 'COMPANY',
    label: 'Company workspace',
    shortLabel: 'Company',
    tagline: 'Complete employee lifecycle — hire, onboard, manage, pay, grow and exit.',
    icon: 'building-2',
    accent: 'company',
    workflow: ['Recruit & interview', 'Digital onboarding & BGV', 'Projects, timesheets & leave', 'Payroll & benefits', 'Appraisals & trainings', 'Governed exits'],
    home: '/dashboard',
  },
  {
    key: 'agency',
    tenantType: 'RECRUITMENT_AGENCY',
    label: 'Recruitment agency',
    shortLabel: 'Agency',
    tagline: 'Source talent, submit candidates to clients, and track every placement.',
    icon: 'user-search',
    accent: 'agency',
    workflow: ['Talent pool & jobs', 'Client submissions', 'Contact CRM', 'Interview coordination', 'Placement tracking'],
    home: '/dashboard',
  },
  {
    key: 'staffing',
    tenantType: 'STAFFING_COMPANY',
    label: 'Staffing & contracting',
    shortLabel: 'Staffing',
    tagline: 'Run contracts, deploy contractors and bill client work end to end.',
    icon: 'hard-hat',
    accent: 'staffing',
    workflow: ['Client contracts', 'Contractor assignments', 'Deployment & bench', 'Timesheets & billing'],
    home: '/dashboard',
  },
  {
    key: 'recruiter',
    tenantType: 'INDIVIDUAL_RECRUITER',
    label: 'Independent recruiter',
    shortLabel: 'Recruiter',
    tagline: 'A lightweight personal desk for sourcing, submitting and placing candidates.',
    icon: 'contact',
    accent: 'recruiter',
    workflow: ['Personal talent pipeline', 'Client submissions', 'Contact book'],
    home: '/dashboard',
  },
  {
    key: 'platform',
    tenantType: null,
    label: 'Platform operations',
    shortLabel: 'Platform',
    tagline: 'Engage360 operator console — provision and govern client tenants.',
    icon: 'shield-check',
    accent: 'platform',
    workflow: ['Tenant provisioning', 'Requirements & catalogues', 'Platform governance'],
    home: '/tenants',
  },
];

export function segmentByKey(key: string | null | undefined): Segment | null {
  return SEGMENTS.find((s) => s.key === key) ?? null;
}

export function segmentForTenantType(type: TenantType | null | undefined): Segment {
  return SEGMENTS.find((s) => s.tenantType === type) ?? SEGMENTS[0];
}

export interface RouteAccess {
  path: string;
  label: string;
  roles: AppRole[];
  /** Lucide-style icon name for nav */
  icon?: string;
  /** Nav group key */
  group?: string;
}

export const NAV_GROUPS: Record<string, { label: string; order: number }> = {
  platform: { label: 'Platform', order: 1 },
  ats: { label: 'Recruitment (ATS)', order: 2 },
  agency: { label: 'Agency CRM', order: 3 },
  staffing: { label: 'Staffing', order: 4 },
  workforce: { label: 'Workforce & HR', order: 5 },
  operations: { label: 'Operations', order: 6 },
  compensation: { label: 'Compensation', order: 7 },
  performance: { label: 'Performance', order: 8 },
  workflow: { label: 'Workflow', order: 9 },
  admin: { label: 'Administration', order: 10 },
  personal: { label: 'My workspace', order: 11 },
};

/** Route-level access — used by roleGuard and shell navigation */
export const ROUTE_ACCESS: RouteAccess[] = [
  { path: '/dashboard', label: 'Dashboard', roles: ['TENANT_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE', 'INTERVIEWER', 'DEPARTMENT_HEAD'], icon: 'layout-dashboard', group: 'platform' },
  { path: '/reports', label: 'Reports', roles: ['TENANT_ADMIN', 'HR', 'MANAGER'], icon: 'bar-chart-3', group: 'platform' },
  { path: '/settings', label: 'Settings', roles: ['TENANT_ADMIN', 'HR'], icon: 'settings', group: 'platform' },
  { path: '/catalogues', label: 'Catalogues', roles: ['TENANT_ADMIN', 'HR'], icon: 'book-open', group: 'platform' },
  { path: '/requirements', label: 'Requirements', roles: ['TENANT_ADMIN', 'HR', 'PLATFORM_ADMIN'], icon: 'clipboard-list', group: 'platform' },
  { path: '/audit', label: 'Audit trail', roles: ['TENANT_ADMIN', 'HR'], icon: 'shield-check', group: 'platform' },
  { path: '/execution', label: 'Execution', roles: ['TENANT_ADMIN', 'HR'], icon: 'check-circle', group: 'platform' },
  { path: '/tenants', label: 'Tenants', roles: ['PLATFORM_ADMIN'], icon: 'building-2', group: 'platform' },
  { path: '/users', label: 'User accounts', roles: ['TENANT_ADMIN'], icon: 'users', group: 'platform' },

  { path: '/clients', label: 'Hiring clients', roles: ['TENANT_ADMIN', 'HR'], icon: 'briefcase', group: 'ats' },
  { path: '/jobs', label: 'Jobs', roles: ['TENANT_ADMIN', 'HR'], icon: 'file-text', group: 'ats' },
  { path: '/candidates', label: 'Talent pool', roles: ['TENANT_ADMIN', 'HR', 'INTERVIEWER'], icon: 'user-search', group: 'ats' },
  { path: '/applications', label: 'Applications', roles: ['TENANT_ADMIN', 'HR', 'INTERVIEWER'], icon: 'inbox', group: 'ats' },

  { path: '/agency/submissions', label: 'Client submissions', roles: ['TENANT_ADMIN', 'HR'], icon: 'send', group: 'agency' },
  { path: '/agency/contacts', label: 'Agency contacts', roles: ['TENANT_ADMIN', 'HR'], icon: 'contact', group: 'agency' },

  { path: '/contracts', label: 'Contracts', roles: ['TENANT_ADMIN', 'HR', 'MANAGER'], icon: 'file-signature', group: 'staffing' },
  { path: '/contractors', label: 'Contractors', roles: ['TENANT_ADMIN', 'HR', 'MANAGER'], icon: 'hard-hat', group: 'staffing' },

  { path: '/employees', label: 'Employees', roles: ['TENANT_ADMIN', 'HR', 'MANAGER'], icon: 'users-round', group: 'workforce' },
  { path: '/onboarding', label: 'Onboarding', roles: ['TENANT_ADMIN', 'HR', 'INTERVIEWER'], icon: 'user-plus', group: 'workforce' },
  { path: '/preboarding-admin', label: 'Preboarding', roles: ['TENANT_ADMIN', 'HR'], icon: 'clipboard-check', group: 'workforce' },
  { path: '/org', label: 'Departments', roles: ['TENANT_ADMIN', 'HR', 'MANAGER'], icon: 'network', group: 'workforce' },
  { path: '/exit', label: 'Exit management', roles: ['TENANT_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'], icon: 'log-out', group: 'workforce' },

  { path: '/projects', label: 'Projects', roles: ['TENANT_ADMIN', 'HR', 'MANAGER'], icon: 'folder-kanban', group: 'operations' },
  { path: '/manpower', label: 'Manpower', roles: ['TENANT_ADMIN', 'HR', 'MANAGER'], icon: 'users-2', group: 'operations' },
  { path: '/assets', label: 'Assets', roles: ['TENANT_ADMIN', 'HR'], icon: 'laptop', group: 'operations' },
  { path: '/leave', label: 'Attendance & leave', roles: ['TENANT_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'], icon: 'calendar-days', group: 'operations' },
  { path: '/timesheets', label: 'Timesheets', roles: ['TENANT_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'], icon: 'clock', group: 'operations' },

  { path: '/payroll', label: 'Payroll', roles: ['TENANT_ADMIN', 'HR', 'EMPLOYEE'], icon: 'banknote', group: 'compensation' },
  { path: '/benefits', label: 'Benefits', roles: ['TENANT_ADMIN', 'HR', 'EMPLOYEE', 'MANAGER'], icon: 'heart-pulse', group: 'compensation' },
  { path: '/expenses', label: 'Expenses', roles: ['TENANT_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'], icon: 'receipt', group: 'compensation' },

  { path: '/goals', label: 'Goals', roles: ['TENANT_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'], icon: 'target', group: 'performance' },
  { path: '/appraisals', label: 'Appraisals', roles: ['TENANT_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'], icon: 'star', group: 'performance' },
  { path: '/trainings', label: 'Trainings', roles: ['TENANT_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'], icon: 'graduation-cap', group: 'performance' },
  { path: '/recognition', label: 'Recognition', roles: ['TENANT_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'], icon: 'award', group: 'performance' },
  { path: '/surveys', label: 'Surveys & eNPS', roles: ['TENANT_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'], icon: 'bar-chart-3', group: 'performance' },

  { path: '/approvals', label: 'Approvals inbox', roles: ['TENANT_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE', 'DEPARTMENT_HEAD'], icon: 'check-square', group: 'workflow' },
  { path: '/workflows', label: 'Workflows', roles: ['TENANT_ADMIN', 'HR'], icon: 'git-branch', group: 'workflow' },
  { path: '/notifications', label: 'Notifications', roles: ['TENANT_ADMIN', 'HR'], icon: 'bell', group: 'workflow' },

  { path: '/org-masters', label: 'Org masters', roles: ['TENANT_ADMIN', 'HR'], icon: 'building', group: 'admin' },
  { path: '/masters', label: 'Masters', roles: ['TENANT_ADMIN', 'HR', 'MANAGER'], icon: 'database', group: 'admin' },
  { path: '/privacy', label: 'Privacy & consent', roles: ['TENANT_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'], icon: 'lock', group: 'admin' },
  { path: '/compliance', label: 'Compliance', roles: ['TENANT_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'], icon: 'shield-alert', group: 'admin' },
  { path: '/bgc-vendor', label: 'BGV cases', roles: ['BGC_VENDOR'], icon: 'microscope', group: 'admin' },
  { path: '/profile', label: 'My profile', roles: ['TENANT_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE', 'INTERVIEWER', 'BGC_VENDOR', 'DEPARTMENT_HEAD'], icon: 'user', group: 'personal' },
];

/** Module → report codes (RPT catalogue) for per-module reporting tabs */
export const MODULE_REPORTS: Record<string, string[]> = {
  dashboard: ['RPT-001'],
  jobs: ['RPT-002', 'RPT-003', 'RPT-004', 'RPT-005'],
  applications: ['RPT-002', 'RPT-003', 'RPT-004'],
  candidates: ['RPT-002', 'RPT-004'],
  onboarding: ['RPT-006', 'RPT-023'],
  employees: ['RPT-007', 'RPT-008', 'RPT-009'],
  org: ['RPT-007', 'RPT-008'],
  leave: ['RPT-010', 'RPT-011'],
  timesheets: ['RPT-012', 'RPT-013'],
  projects: ['RPT-013', 'RPT-014'],
  manpower: ['RPT-014', 'RPT-013'],
  payroll: ['RPT-015', 'RPT-016'],
  benefits: ['RPT-016'],
  expenses: ['RPT-015'],
  goals: ['RPT-018'],
  appraisals: ['RPT-017', 'RPT-018'],
  trainings: ['RPT-019'],
  recognition: ['RPT-020', 'RPT-021'],
  assets: ['RPT-022'],
  exit: ['RPT-025'],
  audit: ['RPT-024'],
  approvals: ['RPT-001'],
  workflows: ['RPT-001'],
};

export function rolesForPath(path: string): AppRole[] | null {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const entry = ROUTE_ACCESS.find((r) => normalized === r.path || normalized.startsWith(r.path + '/'));
  return entry?.roles ?? null;
}

export function canAccess(roles: string[], path: string): boolean {
  const required = rolesForPath(path);
  if (!required) return true;
  return required.some((r) => roles.includes(r));
}

/** Filter nav routes by tenant type portals (enabledPortals from tenant settings). */
export function routeVisibleForTenant(
  path: string,
  tenantType: TenantType | null | undefined,
  enabledPortals?: string[],
): boolean {
  const portal = ROUTE_PORTAL[path];
  if (!portal) return true;
  const portals =
    enabledPortals?.length
      ? enabledPortals
      : tenantType
        ? TENANT_TYPE_DEFAULT_PORTALS[tenantType]
        : TENANT_TYPE_DEFAULT_PORTALS.COMPANY;
  return portals.includes(portal);
}

export function homeForRoles(roles: string[]): string {
  if (roles.includes('PLATFORM_ADMIN')) return '/tenants';
  if (roles.some((r) => ['TENANT_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE', 'INTERVIEWER', 'DEPARTMENT_HEAD'].includes(r))) {
    return '/dashboard';
  }
  if (roles.includes('BGC_VENDOR')) return '/bgc-vendor';
  return '/dashboard';
}
