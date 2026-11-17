import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.',
  testMatch: '*.cases.ts',
  outputDir: '../../../../.artifacts/watch-ui',
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:18183',
    viewport: { width: 390, height: 844 },
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node serve.mjs',
    url: 'http://127.0.0.1:18183',
    reuseExistingServer: false,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 3000 },
  },
});
