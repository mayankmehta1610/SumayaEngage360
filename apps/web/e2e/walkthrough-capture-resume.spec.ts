import { test, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = path.resolve(__dirname, '../../../docs/video-walkthrough/screenshots');
const TENANT = process.env.E2E_TENANT ?? 'sumaya';

const USERS = {
  manager: { email: 'walk-mgr@sumaya.com', password: 'Walk@12345' },
  employee: { email: 'walk-emp@sumaya.com', password: 'Walk@12345' },
  bgc: { email: 'walk-bgc@sumaya.com', password: 'Walk@12345' },
} as const;

const MANAGER_REMAINING = [
  'goals', 'appraisals', 'trainings', 'recognition', 'approvals', 'masters', 'privacy', 'exit', 'profile',
] as const;

const EMPLOYEE_ROUTES = [
  'dashboard', 'leave', 'timesheets', 'payroll', 'benefits', 'expenses',
  'goals', 'appraisals', 'trainings', 'recognition', 'approvals', 'privacy', 'exit', 'profile',
] as const;

test.describe.configure({ mode: 'serial', timeout: 600_000 });

async function login(page: Page, creds: { email: string; password: string }) {
  await page.goto('/login');
  await page.getByPlaceholder('acme').fill(TENANT);
  await page.locator('input[type="email"]').fill(creds.email);
  await page.locator('input[type="password"]').fill(creds.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/(dashboard|bgc-vendor)/, { timeout: 120_000 });
}

async function capture(page: Page, filename: string, route?: string) {
  if (fs.existsSync(path.join(SCREENSHOT_DIR, filename))) return;
  if (route) {
    await page.goto(`/${route}`, { waitUntil: 'domcontentloaded' });
    await page.locator('.e360-layout, .e360-main, main').first().waitFor({ timeout: 90_000 }).catch(() => {});
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, filename), fullPage: true });
}

test('resume walkthrough screenshots', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  let seq = 56;

  await login(page, USERS.manager);
  for (const route of MANAGER_REMAINING) {
    await capture(page, `${String(seq).padStart(2, '0')}-manager-${route}.png`, route);
    seq++;
  }
  await page.evaluate(() => localStorage.clear());
  await page.goto('/login');

  await login(page, USERS.employee);
  for (const route of EMPLOYEE_ROUTES) {
    await capture(page, `${String(seq).padStart(2, '0')}-employee-${route}.png`, route);
    seq++;
  }
  await page.evaluate(() => localStorage.clear());
  await page.goto('/login');

  await login(page, USERS.bgc);
  await capture(page, `${String(seq).padStart(2, '0')}-bgc-vendor-portal.png`, 'bgc-vendor');
  seq++;
  await capture(page, `${String(seq).padStart(2, '0')}-bgc-vendor-profile.png`, 'profile');
});
