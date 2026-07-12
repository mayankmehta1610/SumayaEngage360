import { expect, test, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const API = process.env.API_URL ?? 'http://127.0.0.1:3000/api';
const TENANT_A = process.env.CAPTURE_TENANT_A;
const TENANT_B = process.env.CAPTURE_TENANT_B;
const PASSWORD = process.env.CAPTURE_PASSWORD ?? 'Flow@12345';
const OUTPUT = path.resolve(__dirname, '../../../docs/video-walkthrough/screenshots-audit');

type Login = { email: string; password: string; tenant?: string };

async function injectSession(page: Page, login: Login) {
  const response = await page.request.post(`${API}/auth/login`, {
    headers: login.tenant ? { 'x-tenant-id': login.tenant } : {},
    data: { email: login.email, password: login.password },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  const session = await response.json();
  await page.goto('/login');
  await page.evaluate(({ session, tenant }) => {
    localStorage.clear();
    localStorage.setItem('e360.token', session.accessToken);
    localStorage.setItem('e360.user', JSON.stringify(session.user));
    if (tenant) localStorage.setItem('e360.tenant', tenant);
  }, { session, tenant: login.tenant });
}

async function capture(page: Page, sequence: number, name: string, route: string) {
  await page.goto(route);
  await page.waitForLoadState('domcontentloaded');
  await page.locator('.e360-layout, .e360-main, main').first().waitFor({ timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(1_200);
  await page.screenshot({
    path: path.join(OUTPUT, `${sequence}-${name}.png`),
    fullPage: true,
  });
}

test('capture role and feature audit screens', async ({ page }) => {
  if (!TENANT_A || !TENANT_B) throw new Error('CAPTURE_TENANT_A and CAPTURE_TENANT_B are required');
  fs.mkdirSync(OUTPUT, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });

  await injectSession(page, { email: 'admin@engage360.com', password: 'Admin@12345' });
  await capture(page, 81, 'platform-admin-tenants', '/tenants');

  await injectSession(page, { tenant: TENANT_A, email: `owner@${TENANT_A}.test`, password: PASSWORD });
  await capture(page, 82, 'tenant-admin-surveys', '/surveys');
  await capture(page, 83, 'tenant-admin-compliance', '/compliance');
  await capture(page, 84, 'tenant-admin-payroll-extras', '/payroll');
  await capture(page, 85, 'tenant-admin-project-skills', '/projects');

  await injectSession(page, { tenant: TENANT_A, email: `manager@${TENANT_A}.test`, password: PASSWORD });
  await page.goto('/manpower');
  await page.waitForTimeout(1_200);
  const projectSelect = page.getByRole('combobox');
  await projectSelect.selectOption({ label: 'Atlas Delivery' });
  await page.getByRole('button', { name: 'Find matches' }).click();
  await expect(page.getByText('Required skills:', { exact: false })).toBeVisible();
  await page.screenshot({ path: path.join(OUTPUT, '86-manager-bench-skill-match.png'), fullPage: true });

  await injectSession(page, { tenant: TENANT_A, email: `employee@${TENANT_A}.test`, password: PASSWORD });
  await capture(page, 87, 'employee-survey-response', '/surveys');
  await capture(page, 88, 'employee-compliance-case', '/compliance');
  await capture(page, 89, 'employee-tax-and-adjustments', '/payroll');

  await injectSession(page, { tenant: TENANT_A, email: `interviewer@${TENANT_A}.test`, password: PASSWORD });
  await capture(page, 90, 'interviewer-assigned-applications', '/applications');
  await capture(page, 91, 'interviewer-assigned-candidates', '/candidates');

  await injectSession(page, { tenant: TENANT_B, email: `owner@${TENANT_B}.test`, password: PASSWORD });
  await capture(page, 92, 'second-tenant-isolation', '/candidates');
});
