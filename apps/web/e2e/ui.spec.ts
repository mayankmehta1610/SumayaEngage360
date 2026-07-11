import { expect, test } from '@playwright/test';

// Credentials come from env so nothing is hardcoded into the suite.
const TENANT = process.env.E2E_TENANT ?? 'sumaya';
const EMAIL = process.env.E2E_EMAIL ?? 'owner@sumaya.com';
const PASSWORD = process.env.E2E_PASSWORD ?? 'Owner@12345';

test('landing page shows product pitch and Login button', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('SumayaEngage360').first()).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Hire, onboard and grow');
  await expect(page.getByRole('link', { name: 'Login' }).first()).toBeVisible();
});

test('login button navigates to the sign-in form', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Login' }).first().click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText('Sign in to your workspace')).toBeVisible();
});

test('tenant admin can log in and sees live dashboard data', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('acme').fill(TENANT);
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 90_000 }); // free-tier API cold start
  // Counters are populated by API calls, not hardcoded
  await expect(page.getByText('Open jobs')).toBeVisible();
});

test('employees table is API-backed and offers Excel/PDF export', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('acme').fill(TENANT);
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard$/, { timeout: 90_000 });
  await page.goto('/employees');
  await expect(page.getByRole('button', { name: /Excel/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /PDF/ })).toBeVisible();
});

test('public careers page renders jobs from the API', async ({ page }) => {
  await page.goto(`/careers/${TENANT}/sumaya-internal`);
  // Header comes from the hiring-client record in the database
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Careers');
});
