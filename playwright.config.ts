import { defineConfig, devices } from '@playwright/test';

/** End-to-end browser tests.  Start the app first (npm run build && npm start, with a TEST database), then:  npm run test:e2e */
export default defineConfig({
  testDir: './tests/e2e', timeout: 30_000, retries: 1, reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'] } }, { name: 'mobile', use: { ...devices['Pixel 7'] } }],
});
