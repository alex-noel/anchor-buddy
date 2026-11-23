import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.',
  testMatch: 'planner.cases.ts',
  testIgnore: '**/planner-harness/**',
  outputDir: '../../../.artifacts/planner-ui',
  workers: 1,
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:18184',
    viewport: { width: 390, height: 844 },
    timezoneId: 'UTC',
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: {
      args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1', '--no-proxy-server'],
    },
  },
  webServer: {
    command: 'node planner-serve.mjs',
    url: 'http://127.0.0.1:18184/',
    reuseExistingServer: false,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5000 },
    timeout: 120_000,
    stdout: 'pipe',
  },
});
