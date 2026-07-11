import { test } from '@playwright/test';
import * as path from 'path';

const SCREENSHOT_DIR = path.resolve(__dirname, '../../../docs/video-walkthrough/screenshots');
const API = process.env.API_URL ?? 'https://engage360-api-qhnr.onrender.com/api';
const WEB = process.env.WEB_URL ?? 'https://engage360-web.onrender.com';
const TENANT = 'sumaya';
const BGC = { email: 'walk-bgc@sumaya.com', password: 'Walk@12345' };

test.describe.configure({ timeout: 300_000 });

async function injectSession(page: import('@playwright/test').Page) {
  const res = await page.request.post(`${API}/auth/login`, {
    headers: { 'x-tenant-id': TENANT, 'Content-Type': 'application/json' },
    data: { email: BGC.email, password: BGC.password },
    timeout: 120_000,
  });
  if (!res.ok()) throw new Error(`Login failed: ${res.status()} ${await res.text()}`);
  const body = await res.json();
  await page.goto(WEB, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ token, user, tenant }) => {
      localStorage.setItem('e360.token', token);
      localStorage.setItem('e360.user', JSON.stringify(user));
      localStorage.setItem('e360.tenant', tenant);
    },
    { token: body.accessToken, user: body.user, tenant: TENANT },
  );
}

test('capture BGC vendor screenshots via API session', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await injectSession(page);
  await page.goto(`${WEB}/bgc-vendor`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '79-bgc-vendor-portal.png'), fullPage: true });
  await page.goto(`${WEB}/profile`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '80-bgc-vendor-profile.png'), fullPage: true });
});
