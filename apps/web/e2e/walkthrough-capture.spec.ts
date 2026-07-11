import { expect, test, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = path.resolve(__dirname, '../../../docs/video-walkthrough/screenshots');
const TENANT = process.env.E2E_TENANT ?? 'sumaya';

const USERS = {
  owner: { email: 'owner@sumaya.com', password: 'Owner@12345' },
  hr: { email: 'walk-hr@sumaya.com', password: 'Walk@12345' },
  manager: { email: 'walk-mgr@sumaya.com', password: 'Walk@12345' },
  employee: { email: 'walk-emp@sumaya.com', password: 'Walk@12345' },
  bgc: { email: 'walk-bgc@sumaya.com', password: 'Walk@12345' },
} as const;

const ADMIN_ROUTES = [
  'dashboard', 'reports', 'settings', 'catalogues', 'requirements', 'audit', 'execution', 'users',
  'clients', 'jobs', 'candidates', 'applications',
  'employees', 'onboarding', 'preboarding-admin', 'org', 'exit',
  'projects', 'manpower', 'assets', 'leave', 'timesheets',
  'payroll', 'benefits', 'expenses',
  'goals', 'appraisals', 'trainings', 'recognition',
  'approvals', 'workflows', 'notifications',
  'org-masters', 'masters', 'privacy', 'profile',
] as const;

const MANAGER_ROUTES = [
  'dashboard', 'employees', 'org', 'projects', 'manpower', 'leave', 'timesheets',
  'benefits', 'expenses', 'goals', 'appraisals', 'trainings', 'recognition',
  'approvals', 'masters', 'privacy', 'exit', 'profile',
] as const;

const EMPLOYEE_ROUTES = [
  'dashboard', 'leave', 'timesheets', 'payroll', 'benefits', 'expenses',
  'goals', 'appraisals', 'trainings', 'recognition', 'approvals', 'privacy', 'exit', 'profile',
] as const;

test.describe.configure({ mode: 'serial', timeout: 600_000 });

test.beforeAll(() => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

async function login(page: Page, creds: { email: string; password: string }, tenant = TENANT) {
  await page.goto('/login');
  await page.getByPlaceholder('acme').fill(tenant);
  await page.locator('input[type="email"]').fill(creds.email);
  await page.locator('input[type="password"]').fill(creds.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/(dashboard|bgc-vendor)/, { timeout: 120_000 });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
}

async function logout(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.goto('/login');
}

async function capture(page: Page, filename: string, route?: string) {
  if (route) {
    await page.goto(`/${route}`);
    await page.waitForLoadState('domcontentloaded');
    await page.locator('.e360-layout, .e360-main, main').first().waitFor({ timeout: 90_000 }).catch(() => {});
    await page.waitForTimeout(400);
  }
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, filename),
    fullPage: true,
  });
}

test('capture full walkthrough screenshots', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });

  // ── Public pages ──
  await page.goto('/');
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await capture(page, '01-landing.png');

  await page.goto(`/careers/${TENANT}/sumaya-internal`);
  await page.waitForLoadState('networkidle', { timeout: 45_000 }).catch(() => {});
  await page.getByRole('heading', { level: 1 }).waitFor({ timeout: 60_000 });
  await capture(page, '02-careers-public.png');

  await page.goto('/login');
  await expect(page.getByText('Sign in to your workspace')).toBeVisible();
  await capture(page, '03-login.png');

  // ── Tenant Admin (owner) — hire-to-exit lifecycle ──
  await login(page, USERS.owner);
  let seq = 4;
  for (const route of ADMIN_ROUTES) {
    const label = route.replace(/-/g, '-');
    await capture(page, `${String(seq).padStart(2, '0')}-tenant-admin-${label}.png`, route);
    seq++;
  }

  // Reports: run sample report for richer screenshot
  await page.goto('/reports');
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  const runBtn = page.getByRole('button', { name: /Run report/i }).first();
  if (await runBtn.isVisible().catch(() => false)) {
    await runBtn.click();
    await page.getByText(/Generated/).waitFor({ timeout: 45_000 }).catch(() => {});
    await page.waitForTimeout(500);
  }
  await capture(page, `${String(seq).padStart(2, '0')}-tenant-admin-reports-run.png`);
  seq++;

  await logout(page);

  // ── HR role (subset highlighting HR workspace) ──
  await login(page, USERS.hr);
  await capture(page, `${String(seq).padStart(2, '0')}-hr-dashboard.png`, 'dashboard');
  seq++;
  for (const route of ['jobs', 'applications', 'onboarding', 'preboarding-admin', 'employees'] as const) {
    await capture(page, `${String(seq).padStart(2, '0')}-hr-${route}.png`, route);
    seq++;
  }
  await logout(page);

  // ── Manager role ──
  await login(page, USERS.manager);
  for (const route of MANAGER_ROUTES) {
    await capture(page, `${String(seq).padStart(2, '0')}-manager-${route}.png`, route);
    seq++;
  }
  await logout(page);

  // ── Employee self-service ──
  await login(page, USERS.employee);
  for (const route of EMPLOYEE_ROUTES) {
    await capture(page, `${String(seq).padStart(2, '0')}-employee-${route}.png`, route);
    seq++;
  }
  await logout(page);

  // ── BGC Vendor portal ──
  await login(page, USERS.bgc);
  await capture(page, `${String(seq).padStart(2, '0')}-bgc-vendor-portal.png`, 'bgc-vendor');
  seq++;
  await capture(page, `${String(seq).padStart(2, '0')}-bgc-vendor-profile.png`, 'profile');
});
