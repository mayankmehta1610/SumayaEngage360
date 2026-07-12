import { defineConfig } from '@playwright/test';

// Remote deployment tests — no local webServer:
//   WEB_URL=https://engage360-web.onrender.com npx playwright test -c playwright.remote.config.ts
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  retries: 1,
  workers: 1,
  use: {
    baseURL: process.env.WEB_URL ?? 'https://engage360-web.onrender.com',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});
