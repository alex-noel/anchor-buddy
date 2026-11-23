import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  outputDir: '../../../.artifacts/e2e',
  workers: 1,
  timeout: 45_000,
  use: {
    baseURL: 'http://127.0.0.1:18082',
    viewport: { width: 1280, height: 900 },
    timezoneId: 'UTC',
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: {
      args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1', '--no-proxy-server'],
    },
  },
  webServer: {
    command: 'node serve.mjs',
    url: 'http://127.0.0.1:18082/',
    reuseExistingServer: false,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
    timeout: 120_000,
    stdout: 'pipe',
  },
});
