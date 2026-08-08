import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e/r7',
  workers: 1,
  retries: 0,
  reporter: [['line'], ['json', { outputFile: 'qa-artifacts/r7-admin-e2e/results.json' }]],
  outputDir: 'qa-artifacts/r7-admin-e2e/test-results',
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'off' },
  webServer: { command: 'node scripts/serve-admin-e2e.cjs', url: 'http://127.0.0.1:4173/v2/', reuseExistingServer: false, timeout: 30_000 },
});
