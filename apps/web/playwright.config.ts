import { defineConfig } from '@playwright/test';

// UI end-to-end tests. Target any deployment:
//   WEB_URL=https://engage360-web.onrender.com npx playwright test
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  retries: 1,
  workers: 1,
  use: {
    baseURL: process.env.WEB_URL ?? 'http://127.0.0.1:4200',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm run start:dev',
      cwd: '../api',
      url: 'http://127.0.0.1:3000/api/health',
      timeout: 120_000,
      reuseExistingServer: true,
    },
    {
      command: 'npm run start -- --host 127.0.0.1 --port 4200',
      cwd: '.',
      url: 'http://127.0.0.1:4200',
      timeout: 120_000,
      reuseExistingServer: true,
    },
  ],
});
