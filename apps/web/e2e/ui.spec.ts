import { APIRequestContext, expect, Page, test } from '@playwright/test';

const API = process.env.API_URL ?? 'http://127.0.0.1:3000/api';
const RUN = Date.now().toString(36);
const TENANT_A = `ui-a-${RUN}`;
const TENANT_B = `ui-b-${RUN}`;
const PASSWORD = 'Flow@12345';

type ApiOptions = { token?: string; tenant?: string; data?: unknown };

async function api(
  request: APIRequestContext,
  method: string,
  path: string,
  options: ApiOptions = {},
) {
  const response = await request.fetch(`${API}${path}`, {
    method,
    headers: {
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.tenant ? { 'x-tenant-id': options.tenant } : {}),
    },
    data: options.data,
  });
  const body = await response.json().catch(() => null);
  return { status: response.status(), body };
}

async function login(
  page: Page,
  tenant: string,
  email: string,
  landing = '/dashboard',
  password = PASSWORD,
) {
  await page.goto('/login');
  await page.getByPlaceholder('acme').fill(tenant);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(new RegExp(`${landing.replace('/', '\\/')}$`));
}

test.describe.serial('role-controlled two-tenant workflows', () => {
  let ownerA = '';
  let managerId = '';

  test.beforeAll(async ({ request }) => {
    await api(request, 'POST', '/auth/register', {
      data: {
        email: 'admin@engage360.com',
        password: 'Admin@12345',
        firstName: 'Platform',
        lastName: 'Admin',
      },
    });
    const platform = await api(request, 'POST', '/auth/login', {
      data: { email: 'admin@engage360.com', password: 'Admin@12345' },
    });
    expect(platform.status).toBeLessThan(300);
    const platformToken = platform.body.accessToken as string;

    for (const [tenant, label] of [[TENANT_A, 'Alpha'], [TENANT_B, 'Beta']] as const) {
      const created = await api(request, 'POST', '/tenants', {
        token: platformToken,
        data: {
          name: `${label} UI ${RUN}`,
          subdomain: tenant,
          country: 'IN',
          adminEmail: `owner@${tenant}.test`,
          adminPassword: PASSWORD,
          adminFirstName: label,
          adminLastName: 'Owner',
        },
      });
      expect(created.status).toBe(201);
    }

    const ownerLogin = await api(request, 'POST', '/auth/login', {
      tenant: TENANT_A,
      data: { email: `owner@${TENANT_A}.test`, password: PASSWORD },
    });
    ownerA = ownerLogin.body.accessToken;
    const scoped = (data?: unknown): ApiOptions => ({ token: ownerA, tenant: TENANT_A, data });

    const department = await api(request, 'POST', '/departments', scoped({ name: 'Engineering' }));
    const manager = await api(request, 'POST', '/employees', scoped({
      email: `manager@${TENANT_A}.test`, password: PASSWORD,
      firstName: 'Maya', lastName: 'Manager', designation: 'Engineering Manager',
      departmentId: department.body.id, joinDate: new Date().toISOString(),
    }));
    managerId = manager.body.id;
    const employee = await api(request, 'POST', '/employees', scoped({
      email: `employee@${TENANT_A}.test`, password: PASSWORD,
      firstName: 'Eli', lastName: 'Employee', designation: 'Engineer',
      departmentId: department.body.id, managerId, joinDate: new Date().toISOString(),
    }));
    await api(request, 'PATCH', `/employees/${manager.body.id}`, scoped({ status: 'ACTIVE' }));
    await api(request, 'PATCH', `/employees/${employee.body.id}`, scoped({ status: 'ACTIVE' }));
    await api(request, 'POST', `/employees/${employee.body.id}/skills`, scoped({ skills: ['Angular', 'PostgreSQL'] }));
    await api(request, 'POST', '/projects', scoped({
      name: 'Atlas Delivery', code: `ATLAS-${RUN}`, managerId,
      requiredSkills: ['Angular', 'PostgreSQL'], location: 'Remote',
    }));
    await api(request, 'POST', '/payroll/adjustments', scoped({
      employeeId: employee.body.id, type: 'BONUS', amount: 5000,
      period: '2026-07', note: 'UI workflow seed',
    }));

    const users = await api(request, 'GET', '/users', scoped());
    const managerUser = users.body.find((u: any) => u.email === `manager@${TENANT_A}.test`);
    await api(request, 'PATCH', `/users/${managerUser.id}/access`, scoped({ roles: ['EMPLOYEE', 'MANAGER'] }));
    const interviewer = await api(request, 'POST', '/users', scoped({
      email: `interviewer@${TENANT_A}.test`, password: PASSWORD,
      firstName: 'Ivy', lastName: 'Interviewer', roles: ['INTERVIEWER'],
    }));
    await api(request, 'POST', '/users', scoped({
      email: `vendor@${TENANT_A}.test`, password: PASSWORD,
      firstName: 'Vera', lastName: 'Vendor', roles: ['BGC_VENDOR'],
    }));

    const client = await api(request, 'POST', '/hiring-clients', scoped({
      name: 'Alpha Careers', slug: `alpha-${RUN}`, isInternal: true,
    }));
    const job = await api(request, 'POST', '/jobs', scoped({
      hiringClientId: client.body.id, title: `UI Engineer ${RUN}`,
      description: 'Role-flow browser test', vacancies: 1, location: 'Remote',
      skills: ['Angular'], interviewPlan: [{ level: 1, name: 'Technical' }],
    }));
    await api(request, 'POST', `/jobs/${job.body.id}/publish`, scoped());
    const resumeRes = await request.post(`${API}/files`, {
      headers: { 'x-tenant-id': TENANT_A },
      multipart: { file: { name: 'resume.pdf', mimeType: 'application/pdf', buffer: Buffer.from('resume') } },
    });
    const resumeBody = await resumeRes.json();
    const application = await api(request, 'POST', `/public/careers/jobs/${job.body.id}/apply`, {
      tenant: TENANT_A,
      data: {
        email: `candidate@${TENANT_A}.test`, firstName: 'Casey', lastName: 'Candidate',
        phone: '9999999999', city: 'Remote', country: 'India',
        linkedIn: 'https://linkedin.com/in/casey',
        professionalSummary: 'Frontend engineer.',
        domainExpertise: ['Web'], yearsExperience: 3,
        skills: ['Angular'],
        experiences: [{ company: 'WebCo', title: 'Dev', startDate: '2022-01-01' }],
        education: [{ institution: 'Uni', degree: 'BS', field: 'CS', year: 2020 }],
        contacts: [{ name: 'Mgr', relationship: 'Manager', email: 'm@ex.com', phone: '8888888888' }],
        resumeFileId: resumeBody.id,
      },
    });
    await api(request, 'POST', `/applications/${application.body.id}/interviews`, scoped({
      level: 1, name: 'Technical', mode: 'TEAMS', interviewerId: interviewer.body.id,
    }));

    await api(request, 'POST', '/benefits/plans', scoped({
      code: `MED-${RUN}`, name: 'Medical cover', category: 'HEALTH',
    }));
    await api(request, 'POST', '/assets', scoped({
      assetTag: `LAP-${RUN}`, category: 'LAPTOP', model: 'ThinkPad',
    }));
    await api(request, 'POST', '/goals', scoped({
      employeeId: employee.body.id, title: 'Ship role-safe workflow', target: '100%',
    }));
    const bgvVendor = await api(request, 'POST', '/bgc/vendors', scoped({
      name: 'Verified Checks', email: `vendor@${TENANT_A}.test`,
    }));
    await api(request, 'POST', `/bgc/employees/${employee.body.id}/submit`, scoped({
      vendorId: bgvVendor.body.id,
    }));
  });

  test('platform admin is isolated to platform modules', async ({ page }) => {
    await login(page, '', 'admin@engage360.com', '/tenants', 'Admin@12345');
    await expect(page.getByRole('link', { name: 'Tenants' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Requirements' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Employees' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Payroll' })).toHaveCount(0);
    await page.goto('/employees');
    await expect(page).toHaveURL(/\/tenants$/);
  });

  test('tenant admin can administer roles, benefits, and assets', async ({ page }) => {
    await login(page, TENANT_A, `owner@${TENANT_A}.test`);

    await page.goto('/users');
    await expect(page.getByText(`manager@${TENANT_A}.test`)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save roles' }).first()).toBeVisible();

    await page.goto('/benefits');
    await expect(page.getByRole('button', { name: 'Add plan' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enroll' }).first()).toBeVisible();

    await page.goto('/assets');
    await expect(page.getByRole('button', { name: 'Assign' }).first()).toBeVisible();

    await page.goto('/employees');
    await expect(page.getByRole('heading', { name: 'Employment status actions' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mark on notice' }).first()).toBeVisible();

    await page.goto('/payroll');
    await expect(page.getByRole('heading', { name: 'Add payroll adjustment' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tax declaration verification' })).toBeVisible();
  });

  test('manager gets operational actions but not tenant administration', async ({ page }) => {
    await login(page, TENANT_A, `manager@${TENANT_A}.test`);
    await expect(page.getByRole('link', { name: 'Projects' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Hiring clients' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Jobs' })).toHaveCount(0);

    await page.goto('/projects');
    await expect(page.getByRole('heading', { name: 'Create project' })).toHaveCount(0);

    await page.goto('/org');
    await expect(page.getByText('Read only').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add' })).toHaveCount(0);

    await page.goto('/goals');
    await expect(page.getByRole('heading', { name: 'Assign goal' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Eli Employee' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add KPI' })).toHaveCount(0);

    await page.goto('/manpower');
    await expect(page.getByRole('heading', { name: 'Bench capacity' })).toBeVisible();
    await page.getByRole('combobox').selectOption({ label: 'Atlas Delivery' });
    await page.getByRole('button', { name: 'Find matches' }).click();
    await expect(page.getByText('Angular, PostgreSQL')).toBeVisible();
  });

  test('employee self-service hides all administration controls', async ({ page }) => {
    await login(page, TENANT_A, `employee@${TENANT_A}.test`);

    await page.goto('/benefits');
    await expect(page.getByRole('button', { name: 'Add plan' })).toHaveCount(0);

    await page.goto('/goals');
    await expect(page.getByRole('button', { name: 'Add KPI' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Assign goal' })).toHaveCount(0);

    await page.goto('/approvals');
    await expect(page.getByRole('heading', { name: 'Configure workflow' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'My pending approvals' })).toBeVisible();

    await page.goto('/payroll');
    await expect(page.getByRole('heading', { name: 'Tax declaration' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Add payroll adjustment' })).toHaveCount(0);

    await page.goto('/surveys');
    await expect(page.getByRole('heading', { name: 'Create survey' })).toHaveCount(0);

    await page.goto('/compliance');
    await expect(page.getByRole('heading', { name: 'Case board (HR / compliance officers)' })).toHaveCount(0);
  });

  test('interviewer sees only assigned interview work', async ({ page }) => {
    await login(page, TENANT_A, `interviewer@${TENANT_A}.test`);
    await expect(page.getByRole('link', { name: 'Applications' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Talent pool' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Jobs' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Hiring clients' })).toHaveCount(0);

    await page.goto('/applications');
    await expect(page.getByText('Casey Candidate')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Record result' })).toBeVisible();
    await expect(page.getByText('Move to status')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Schedule round' })).toHaveCount(0);

    await page.goto('/jobs');
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('second tenant cannot see first tenant recruitment data', async ({ page }) => {
    await login(page, TENANT_B, `owner@${TENANT_B}.test`);
    await page.goto('/candidates');
    await expect(page.getByText('Casey Candidate')).toHaveCount(0);
    await expect(page.getByText(/No candidates yet/)).toBeVisible();
  });

  test('BGC vendor lands in the assigned case portal only', async ({ page }) => {
    await login(page, TENANT_A, `vendor@${TENANT_A}.test`, '/bgc-vendor');
    await expect(page.getByRole('heading', { name: 'BGV vendor portal' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mark clear' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'BGV cases' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Employees' })).toHaveCount(0);
    await page.goto('/employees');
    await expect(page).toHaveURL(/\/bgc-vendor$/);
  });
});
