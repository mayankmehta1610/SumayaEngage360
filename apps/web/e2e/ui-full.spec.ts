import { APIRequestContext, expect, Page, test } from '@playwright/test';

const API = process.env.API_URL ?? 'http://127.0.0.1:3000/api';
const REMOTE = (process.env.WEB_URL ?? '').includes('onrender.com');
const RUN = Date.now().toString(36);
const LOCAL_TENANT = `ui-full-${RUN}`;
const PASSWORD = REMOTE ? (process.env.E2E_PASSWORD ?? 'Owner@12345') : 'Flow@12345';
const TENANT = REMOTE ? (process.env.E2E_TENANT ?? 'sumaya') : LOCAL_TENANT;
const EMAIL = REMOTE ? (process.env.E2E_EMAIL ?? 'owner@sumaya.com') : `owner@${LOCAL_TENANT}.test`;

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

async function login(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder('acme').fill(TENANT);
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/(dashboard|home)/, { timeout: 30_000 });
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
      test.skip(true, 'Local API/DB unavailable — run docker compose up and start API');
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
  });

  test('login and verify employment types load from API', async ({ page }) => {
    await login(page);
    await page.goto('/jobs');
    await page.waitForTimeout(1500);
    const options = page.locator('label:has-text("Employment type") + select option, select option');
    await expect(options).not.toHaveCount(0);
    const count = await options.count();
    expect(count).toBeGreaterThan(1);
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
    await page.getByPlaceholder(/senior backend engineer/i).fill(title);
    await page.getByLabel('Location').fill('Remote');
    await page.locator('textarea').first().fill('Automated UI test job');
    await page.getByPlaceholder(/screening, technical/i).fill('Screening, Technical');
    const empSelect = page.locator('label:has-text("Employment type") + select').first();
    if (await empSelect.isVisible()) {
      await empSelect.selectOption({ index: 1 });
    }
    await page.getByRole('button', { name: /create job/i }).click();
    await expect(page.getByRole('cell', { name: title })).toBeVisible({ timeout: 15_000 });
  });

  test('configure leave type and submit leave request', async ({ page }) => {
    await login(page);
    await page.goto('/leave');

    const code = `AL${RUN.slice(-4)}`;
    await page.getByPlaceholder('AL').fill(code);
    await page.getByPlaceholder('Annual Leave').fill(`Annual ${RUN}`);
    await page.getByRole('button', { name: /add$/i }).click();

    await page.locator('select').first().selectOption({ index: 1 });
    const today = new Date().toISOString().slice(0, 10);
    await page.locator('input[type="date"]').first().fill(today);
    await page.locator('input[type="date"]').nth(1).fill(today);
    await page.getByRole('button', { name: /submit leave request/i }).click();
    await expect(page.getByText(/PENDING|APPROVED/)).toBeVisible({ timeout: 15_000 });
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
    await page.waitForTimeout(1500);
    const badgeOptions = page.locator('label:has-text("Badge") + select option');
    const count = await badgeOptions.count();
    expect(count).toBeGreaterThan(0);
  });
});
