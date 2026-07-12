import { defineConfig } from '@playwright/test';

const defaultWebUrl = 'https://engage360-web.onrender.com';
if (!process.env.WEB_URL) {
  process.env.WEB_URL = defaultWebUrl;
}

// Remote deployment tests — no local webServer:
//   npx playwright test -c playwright.remote.config.ts
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  retries: 1,
  workers: 1,
  use: {
    baseURL: process.env.WEB_URL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});
