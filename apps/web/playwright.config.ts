import { defineConfig } from '@playwright/test';

// UI end-to-end tests. Target any deployment:
//   WEB_URL=https://engage360-web.onrender.com npx playwright test
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 1,
  use: {
    baseURL: process.env.WEB_URL ?? 'https://engage360-web.onrender.com',
    screenshot: 'only-on-failure',
  },
});
