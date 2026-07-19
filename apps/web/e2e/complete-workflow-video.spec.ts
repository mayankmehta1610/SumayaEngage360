import { expect, test, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const OUTPUT = path.resolve(__dirname, '../../../docs/video-walkthrough/complete-workflow/screens');
const API = process.env.API_URL ?? 'http://127.0.0.1:3000/api';
const TENANT = 'acme';
const USER = { email: 'admin@acme.demo', password: 'Acme@12345' };

test.describe.configure({ mode: 'serial', timeout: 600_000 });

async function injectSession(page: Page) {
  const response = await page.request.post(`${API}/auth/login`, {
    headers: { 'x-tenant-id': TENANT },
    data: USER,
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  const session = await response.json();
  await page.goto('/login');
  await page.evaluate(({ session, tenant }) => {
    localStorage.clear();
    localStorage.setItem('e360.token', session.accessToken);
    localStorage.setItem('e360.user', JSON.stringify(session.user));
    localStorage.setItem('e360.tenant', tenant);
  }, { session, tenant: TENANT });
}

async function settle(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.locator('.e360-layout, .e360-main, main').first().waitFor({ timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(1_200);
}

async function viewportShot(page: Page, name: string) {
  await page.screenshot({ path: path.join(OUTPUT, name), fullPage: false });
}

test('capture the populated end-to-end workflow', async ({ page }) => {
  fs.mkdirSync(OUTPUT, { recursive: true });
  await page.setViewportSize({ width: 1600, height: 900 });

  await page.goto('/');
  await page.waitForLoadState('networkidle').catch(() => {});
  await viewportShot(page, '01-platform-overview.png');

  await injectSession(page);
  await page.goto('/dashboard');
  await settle(page);
  await viewportShot(page, '02-dashboard.png');

  await page.goto('/applications');
  await settle(page);
  await viewportShot(page, '03-recruitment-lifecycle.png');

  await page.goto('/global-mobility');
  await settle(page);
  await viewportShot(page, '04-global-mobility-overview.png');

  const countryCard = page.locator('.card').filter({ has: page.getByRole('heading', { name: '2. Country requirements' }) });
  const countrySelect = countryCard.locator('select').first();
  const countries = [
    ['IN', '05-india'], ['US', '06-united-states'], ['GB', '07-united-kingdom'],
    ['CA', '08-canada'], ['AU', '09-australia'], ['NZ', '10-new-zealand'],
    ['EU', '11-european-union'], ['AE', '12-united-arab-emirates'],
    ['SA', '13-saudi-arabia'], ['QA', '14-qatar'], ['BH', '15-bahrain'],
    ['KW', '16-kuwait'], ['OM', '17-oman'],
  ] as const;
  for (const [code, name] of countries) {
    await countrySelect.selectOption(code);
    await page.waitForTimeout(250);
    await countryCard.screenshot({ path: path.join(OUTPUT, `${name}-workflow.png`) });
  }

  const employerProfiles = page.locator('.card').filter({ has: page.getByRole('heading', { name: '4. Employer profiles' }) });
  await employerProfiles.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await employerProfiles.screenshot({ path: path.join(OUTPUT, '18-employer-country-profiles.png') });

  const candidateProfile = page.locator('.card').filter({ has: page.getByRole('heading', { name: '5. Candidate country profile' }) });
  await candidateProfile.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await viewportShot(page, '19-candidate-country-profile.png');

  const authorization = page.locator('.card').filter({ has: page.getByRole('heading', { name: '7. Authorization lifecycle' }) });
  await authorization.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await authorization.screenshot({ path: path.join(OUTPUT, '20-work-authorization-lifecycle.png') });

  await page.goto('/reports');
  await settle(page);
  const reportButton = page.getByRole('button', { name: /RPT-026.*Global Mobility/i });
  await reportButton.scrollIntoViewIfNeeded();
  await reportButton.click();
  await page.getByRole('button', { name: /Run report/i }).click();
  await expect(page.getByText('Employer country profiles', { exact: true })).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(600);
  await viewportShot(page, '21-global-mobility-report.png');

  await page.setViewportSize({ width: 430, height: 900 });
  await page.goto('/global-mobility');
  await settle(page);
  await viewportShot(page, '22-mobile-responsive-workflow.png');

  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto('/employees');
  await settle(page);
  await viewportShot(page, '23-employee-lifecycle.png');
});
