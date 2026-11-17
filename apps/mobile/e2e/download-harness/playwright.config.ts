import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '*.cases.ts',
  outputDir: '../../../../.artifacts/e2e-download-harness',
  workers: 1,
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:18083',
    viewport: { width: 390, height: 844 },
    timezoneId: 'UTC',
    serviceWorkers: 'allow',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: {
      args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1', '--no-proxy-server'],
    },
  },
  webServer: {
    command: 'node serve.mjs',
    url: 'http://127.0.0.1:18083/',
    reuseExistingServer: false,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
    timeout: 120_000,
    stdout: 'pipe',
  },
});
