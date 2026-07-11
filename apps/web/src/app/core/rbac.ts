/**
 * RBAC matrix — maps modules/routes to allowed roles.
 * PLATFORM_ADMIN bypasses all checks (enforced in guards).
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
  workforce: { label: 'Workforce & HR', order: 3 },
  operations: { label: 'Operations', order: 4 },
  compensation: { label: 'Compensation', order: 5 },
  performance: { label: 'Performance', order: 6 },
  workflow: { label: 'Workflow', order: 7 },
  admin: { label: 'Administration', order: 8 },
  personal: { label: 'My workspace', order: 9 },
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

  { path: '/clients', label: 'Hiring clients', roles: ['TENANT_ADMIN', 'HR', 'INTERVIEWER'], icon: 'briefcase', group: 'ats' },
  { path: '/jobs', label: 'Jobs', roles: ['TENANT_ADMIN', 'HR', 'INTERVIEWER'], icon: 'file-text', group: 'ats' },
  { path: '/candidates', label: 'Talent pool', roles: ['TENANT_ADMIN', 'HR', 'INTERVIEWER'], icon: 'user-search', group: 'ats' },
  { path: '/applications', label: 'Applications', roles: ['TENANT_ADMIN', 'HR', 'INTERVIEWER'], icon: 'inbox', group: 'ats' },

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

  { path: '/approvals', label: 'Approvals inbox', roles: ['TENANT_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE', 'DEPARTMENT_HEAD'], icon: 'check-square', group: 'workflow' },
  { path: '/workflows', label: 'Workflows', roles: ['TENANT_ADMIN', 'HR'], icon: 'git-branch', group: 'workflow' },
  { path: '/notifications', label: 'Notifications', roles: ['TENANT_ADMIN', 'HR'], icon: 'bell', group: 'workflow' },

  { path: '/org-masters', label: 'Org masters', roles: ['TENANT_ADMIN', 'HR'], icon: 'building', group: 'admin' },
  { path: '/masters', label: 'Masters', roles: ['TENANT_ADMIN', 'HR', 'MANAGER'], icon: 'database', group: 'admin' },
  { path: '/privacy', label: 'Privacy & consent', roles: ['TENANT_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'], icon: 'lock', group: 'admin' },
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
  if (roles.includes('PLATFORM_ADMIN')) return true;
  const required = rolesForPath(path);
  if (!required) return true;
  return required.some((r) => roles.includes(r));
}
