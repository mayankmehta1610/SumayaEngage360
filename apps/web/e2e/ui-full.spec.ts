import { APIRequestContext, expect, Page, test } from '@playwright/test';

const API = process.env.API_URL ?? 'http://127.0.0.1:3000/api';
const REMOTE = (process.env.WEB_URL ?? '').includes('onrender.com');
const RUN = Date.now().toString(36);
const LOCAL_TENANT = `ui-full-${RUN}`;
const PASSWORD = REMOTE ? (process.env.E2E_PASSWORD ?? 'Owner@12345') : 'Flow@12345';
const TENANT = REMOTE ? (process.env.E2E_TENANT ?? 'sumaya') : LOCAL_TENANT;
const EMAIL = REMOTE ? (process.env.E2E_EMAIL ?? 'owner@sumaya.com') : `owner@${LOCAL_TENANT}.test`;
const LEAVE_EMAIL = REMOTE
  ? (process.env.E2E_EMPLOYEE_EMAIL ?? 'walk-emp@sumaya.com')
  : `leave@${LOCAL_TENANT}.test`;
const LEAVE_PASSWORD = REMOTE ? (process.env.E2E_EMPLOYEE_PASSWORD ?? 'Walk@12345') : PASSWORD;

type ApiOptions = { token?: string; tenant?: string; data?: unknown };
type LoginCreds = { tenant?: string; email?: string; password?: string };

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

function nextWeekdayISO() {
  const d = new Date();
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d.toISOString().slice(0, 10);
}

async function login(page: Page, creds: LoginCreds = {}) {
  const tenant = creds.tenant ?? TENANT;
  const email = creds.email ?? EMAIL;
  const password = creds.password ?? PASSWORD;
  await page.goto('/login');
  await page.getByPlaceholder('acme').fill(tenant);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/(dashboard|home)/, { timeout: 30_000 });
}

function selectField(page: Page, label: string) {
  return page.locator('.e360-select').filter({
    has: page.locator('.e360-select-label', { hasText: label }),
  });
}

async function openSelectOptions(page: Page, label: string) {
  const field = selectField(page, label);
  await field.locator('.e360-select-trigger').click();
  await expect(field.locator('.e360-select-panel')).toBeVisible();
  return field.locator('.e360-select-option');
}

test.describe.serial('full lifecycle UI data generation', () => {
  let ownerToken = '';

  test.beforeAll(async ({ request }) => {
    if (REMOTE) return;

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
    const platformToken = platform.body?.accessToken as string;
    if (!platformToken) {
      test.skip(true, 'Local API/DB unavailable - run docker compose up and start API');
    }

    await api(request, 'POST', '/tenants', {
      token: platformToken,
      data: {
        name: `UI Full ${RUN}`,
        subdomain: LOCAL_TENANT,
        country: 'IN',
        adminEmail: EMAIL,
        adminPassword: PASSWORD,
        adminFirstName: 'Owner',
        adminLastName: 'Test',
      },
    });

    const ownerLogin = await api(request, 'POST', '/auth/login', {
      tenant: LOCAL_TENANT,
      data: { email: EMAIL, password: PASSWORD },
    });
    ownerToken = ownerLogin.body.accessToken;
    expect(ownerToken).toBeTruthy();

    const scoped = { token: ownerToken, tenant: LOCAL_TENANT };
    await api(request, 'GET', '/org-masters/employment-types', scoped);
    await api(request, 'GET', '/recognition-badges', scoped);
    await api(request, 'POST', '/employees', {
      ...scoped,
      data: {
        email: LEAVE_EMAIL,
        password: LEAVE_PASSWORD,
        firstName: 'Leave',
        lastName: 'Tester',
        designation: 'Engineer',
      },
    });
  });

  test('login and verify employment types load from API', async ({ page }) => {
    await login(page);
    await page.goto('/jobs');
    const options = await openSelectOptions(page, 'Employment type');
    expect(await options.count()).toBeGreaterThan(0);
  });

  test('create department and designation via UI', async ({ page }) => {
    await login(page);
    await page.goto('/org');

    const deptName = `Dept ${RUN}`;
    await page.getByPlaceholder('IT').fill(deptName);
    await page.getByRole('button', { name: /^add$/i }).first().click();
    await expect(page.getByText(deptName)).toBeVisible({ timeout: 15_000 });

    const desigName = `Desig ${RUN}`;
    await page.getByPlaceholder('Senior Engineer').fill(desigName);
    await page.getByRole('button', { name: /^add$/i }).nth(1).click();
    await expect(page.getByText(desigName)).toBeVisible({ timeout: 15_000 });
  });

  test('create job with API-loaded employment type', async ({ page, request }) => {
    if (!REMOTE) {
      await api(request, 'POST', '/hiring-clients', {
        token: ownerToken,
        tenant: LOCAL_TENANT,
        data: { name: `Client ${RUN}`, slug: `c-${RUN}`, isInternal: true },
      });
    }

    await login(page);
    await page.goto('/jobs');

    const title = `E2E Job ${RUN}`;
    const jobForm = page.locator('div.card').filter({
      has: page.getByRole('heading', { name: 'Create job requisition' }),
    });
    await jobForm.getByPlaceholder(/senior backend engineer/i).fill(title);
    await jobForm.locator('#job-location').or(jobForm.locator('input').nth(1)).fill('Remote');
    await jobForm.locator('textarea').fill('Automated UI test job');
    await jobForm.getByPlaceholder(/screening, technical/i).fill('Screening, Technical');
    const empOptions = await openSelectOptions(page, 'Employment type');
    if ((await empOptions.count()) > 1) await empOptions.nth(1).click();
    else await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /create job/i }).click();
    await expect(page.getByRole('cell', { name: title })).toBeVisible({ timeout: 15_000 });
  });

  test('configure leave type and submit leave request', async ({ page }) => {
    const code = `E2E${RUN.slice(-4).toUpperCase()}`;
    const leaveName = `Annual ${RUN}`;

    await login(page);
    await page.goto('/leave');
    await page.getByRole('heading', { name: /Configure leave types/i }).scrollIntoViewIfNeeded();
    await page.getByPlaceholder('AL', { exact: true }).fill(code);
    await page.getByPlaceholder('Annual Leave').fill(leaveName);
    await page
      .locator('h2:has-text("Configure leave types")')
      .locator('xpath=ancestor::div[1]')
      .getByRole('button', { name: /^add$/i })
      .click();
    await expect(page.locator('span.badge', { hasText: code })).toBeVisible({ timeout: 15_000 });

    await login(page, { email: LEAVE_EMAIL, password: LEAVE_PASSWORD });
    await page.goto('/leave');

    await page.getByRole('button', { name: 'Type', exact: true }).click();
    const leaveOptions = page.locator('.e360-select-panel [role="option"]');
    await expect(leaveOptions.filter({ hasText: code })).toHaveCount(1, { timeout: 15_000 });
    await leaveOptions.filter({ hasText: code }).click();

    const applyCard = page.locator('.card').filter({
      has: page.getByRole('heading', { name: 'Apply for leave' }),
    });
    const leaveDay = nextWeekdayISO();
    await applyCard.locator('input[type="date"]').nth(0).fill(leaveDay);
    await applyCard.locator('input[type="date"]').nth(1).fill(leaveDay);
    await expect(page.getByRole('button', { name: /submit leave request/i })).toBeEnabled();
    await page.getByRole('button', { name: /submit leave request/i }).click();
    await expect(page.getByText(/PENDING|APPROVED/).first()).toBeVisible({ timeout: 15_000 });
  });

  test('masters page shows extended admin sections', async ({ page }) => {
    await login(page);
    await page.goto('/masters');
    await expect(page.getByText(/positions/i).first()).toBeVisible();
    await expect(page.getByText(/recognition badges/i).first()).toBeVisible();
    await expect(page.getByText(/salary components/i).first()).toBeVisible();
  });

  test('recognition badges load from API', async ({ page }) => {
    await login(page);
    await page.goto('/recognition');
    const options = await openSelectOptions(page, 'Badge');
    expect(await options.count()).toBeGreaterThan(0);
  });
});