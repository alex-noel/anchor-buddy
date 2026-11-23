import { test, expect } from '@playwright/test';
import { createDefaultSearch, createVesselDraft } from '@anchor-buddy/domain';
const search = createDefaultSearch([16, 43]);
const vessel = {
  ...createVesselDraft(),
  name: 'Offline test vessel',
  lengthM: 10,
  beamM: 3,
  loadedDraftM: 1.5,
  displacementKg: 4000,
  anchor: { ...createVesselDraft().anchor, type: 'other', usableLengthM: 60, bowRollerHeightM: 0 },
};
const settings = {
  schemaVersion: 2,
  kind: 'settings',
  id: 'local-settings',
  revision: 'offline-test',
  savedAt: new Date().toISOString(),
  payload: {
    vessel,
    searchDefaults: search,
    units: 'metric',
    offline: false,
    layers: { depth: true, bedding: true, marks: true },
    language: 'en',
    confirmed: { vessel: true, defaults: true },
    setupComplete: true,
  },
};
test.beforeEach(async ({ page, context, baseURL }) => {
  await context.route('**/*', (route) =>
    new URL(route.request().url()).origin === baseURL ? route.continue() : route.abort(),
  );
  await page.addInitScript((settings) => {
    if (!localStorage.getItem('anchorai:v1:settings-v2'))
      localStorage.setItem('anchorai:v1:settings-v2', JSON.stringify(settings));
  }, settings);
  await page.goto('/');
  await page.getByRole('tab', { name: 'Settings', exact: true }).click();
});
test('verified exported application survives offline reload and explains a waiting update', async ({
  page,
  context,
}) => {
  await page
    .getByRole('button', { name: 'Prepare application for offline use', exact: true })
    .click();
  await expect(
    page.getByText('Application files are ready for offline startup.', { exact: true }),
  ).toBeVisible();
  const before = await page.evaluate(() => localStorage.getItem('anchorai:v1:settings-v2'));
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('tab', { name: 'Settings', exact: true }).click();
  await expect(
    page.getByText('Application files are ready for offline startup.', { exact: true }),
  ).toBeVisible();
  await context.setOffline(false);
  await page.request.post('/__test__/update');
  await page.getByRole('button', { name: 'Check application update', exact: true }).click();
  await expect(page.getByText(/A verified update is waiting/)).toBeVisible();
  expect(await page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem('anchorai:v1:settings-v2'))).toBe(before);
});
test('failed integrity update preserves the previous complete shell and settings', async ({
  page,
  context,
}) => {
  await page
    .getByRole('button', { name: 'Prepare application for offline use', exact: true })
    .click();
  await expect(
    page.getByText('Application files are ready for offline startup.', { exact: true }),
  ).toBeVisible();
  const before = await page.evaluate(() => localStorage.getItem('anchorai:v1:settings-v2'));
  await page.request.post('/__test__/update?invalid=true');
  await page.getByRole('button', { name: 'Check application update', exact: true }).click();
  await expect(page.getByText(/An application update could not be verified/)).toBeVisible();
  await expect(
    page.getByText('Application files are ready for offline startup.', { exact: true }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('tab', { name: 'Settings', exact: true }).click();
  await expect(
    page.getByText('Application files are ready for offline startup.', { exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('anchorai:v1:settings-v2'))).toBe(before);
});

test('a foreign worker on the same origin is not application readiness', async ({page}) => {
  await page.evaluate(async () => { await navigator.serviceWorker.register('/__test__/foreign-sw.js', {scope:'/'}); });
  await page.waitForFunction(() => navigator.serviceWorker.controller?.scriptURL.endsWith('/__test__/foreign-sw.js'));
  await page.reload();
  await page.getByRole('tab', {name:'Settings',exact:true}).click();
  await expect(page.getByText('Application files are not yet ready for offline startup.',{exact:true})).toBeVisible();
  await expect(page.getByText('Application files are ready for offline startup.',{exact:true})).toHaveCount(0);
});
