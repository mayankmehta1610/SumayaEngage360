import { Role } from '@prisma/client';

/**
 * API RBAC matrix — documents which roles can access each module.
 * Enforced via @Roles decorator + global RolesGuard.
 * Platform access is granted explicitly per endpoint, never as a tenant-role bypass.
 */
export interface ModuleRbac {
  module: string;
  path: string;
  roles: Role[];
  description: string;
}

export const API_RBAC_MATRIX: ModuleRbac[] = [
  { module: 'Tenants', path: '/tenants', roles: [Role.PLATFORM_ADMIN], description: 'Platform tenant provisioning' },
  { module: 'Users', path: '/users', roles: [Role.TENANT_ADMIN], description: 'Tenant user account management' },
  { module: 'Jobs (ATS)', path: '/jobs', roles: [Role.TENANT_ADMIN, Role.HR], description: 'Job requisitions and publishing' },
  { module: 'Candidates', path: '/candidates', roles: [Role.TENANT_ADMIN, Role.HR, Role.INTERVIEWER], description: 'Talent pool' },
  { module: 'Applications', path: '/applications', roles: [Role.TENANT_ADMIN, Role.HR, Role.INTERVIEWER], description: 'Application pipeline' },
  { module: 'Employees', path: '/employees', roles: [Role.TENANT_ADMIN, Role.HR, Role.MANAGER], description: 'Employee directory (write: HR/Admin)' },
  { module: 'Onboarding', path: '/onboarding', roles: [Role.TENANT_ADMIN, Role.HR], description: 'Onboarding cases' },
  { module: 'BGC', path: '/bgc', roles: [Role.TENANT_ADMIN, Role.HR, Role.BGC_VENDOR], description: 'Background verification' },
  { module: 'Payroll', path: '/payroll', roles: [Role.TENANT_ADMIN, Role.HR, Role.EMPLOYEE], description: 'Payroll runs and payslips' },
  { module: 'Benefits', path: '/benefits', roles: [Role.TENANT_ADMIN, Role.HR, Role.MANAGER, Role.EMPLOYEE], description: 'Benefits enrollment' },
  { module: 'Expenses', path: '/expenses', roles: [Role.TENANT_ADMIN, Role.HR, Role.MANAGER, Role.EMPLOYEE], description: 'Expense claims' },
  { module: 'Goals', path: '/goals', roles: [Role.TENANT_ADMIN, Role.HR, Role.MANAGER, Role.EMPLOYEE], description: 'OKRs and goals' },
  { module: 'Appraisals', path: '/appraisals', roles: [Role.TENANT_ADMIN, Role.HR, Role.MANAGER, Role.EMPLOYEE], description: 'Performance appraisals' },
  { module: 'Timesheets', path: '/timesheets', roles: [Role.TENANT_ADMIN, Role.HR, Role.MANAGER, Role.EMPLOYEE], description: 'Time tracking' },
  { module: 'Attendance', path: '/attendance', roles: [Role.TENANT_ADMIN, Role.HR, Role.MANAGER, Role.EMPLOYEE], description: 'Attendance records' },
  { module: 'Leave', path: '/leave', roles: [Role.TENANT_ADMIN, Role.HR, Role.MANAGER, Role.EMPLOYEE], description: 'Leave requests' },
  { module: 'Projects', path: '/projects', roles: [Role.TENANT_ADMIN, Role.HR, Role.MANAGER], description: 'Project staffing' },
  { module: 'Approvals', path: '/approvals', roles: [Role.TENANT_ADMIN, Role.HR, Role.MANAGER, Role.EMPLOYEE, Role.DEPARTMENT_HEAD], description: 'Approval inbox and workflows' },
  { module: 'Reports', path: '/reports', roles: [Role.TENANT_ADMIN, Role.HR, Role.MANAGER], description: 'Analytics catalogue' },
  { module: 'Audit', path: '/audit', roles: [Role.TENANT_ADMIN, Role.HR], description: 'Audit trail' },
  { module: 'Dashboard', path: '/dashboard', roles: [Role.TENANT_ADMIN, Role.HR, Role.MANAGER, Role.EMPLOYEE, Role.INTERVIEWER, Role.DEPARTMENT_HEAD], description: 'KPI dashboard' },
  { module: 'Engagement', path: '/recognitions', roles: [Role.TENANT_ADMIN, Role.HR, Role.MANAGER, Role.EMPLOYEE], description: 'Recognition and feedback' },
];

export function rolesForModule(path: string): Role[] | null {
  const entry = API_RBAC_MATRIX.find((m) => path.startsWith(m.path));
  return entry?.roles ?? null;
}
