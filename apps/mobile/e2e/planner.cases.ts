import { expect, test, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import {
  createDefaultSearch,
  createVesselDraft,
  canonicalVesselCompatibility,
} from '@anchor-buddy/domain';
import { createEmptyRegion } from '../src/lib/regionalDataCore';

const btn = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const field = (page: Page, name: string) => page.getByRole('textbox', { name, exact: true });
const vessel = {
  ...createVesselDraft(),
  id: 'local-vessel',
  name: 'Browser Vessel',
  lengthM: 10,
  beamM: 3,
  loadedDraftM: 1.5,
  displacementKg: 4000,
  anchor: {
    ...createVesselDraft().anchor,
    type: 'modern-scoop',
    usableLengthM: 60,
    bowRollerHeightM: 1,
  },
};
const hash = createHash('sha256').update(canonicalVesselCompatibility(vessel)).digest('hex');
const future = createDefaultSearch([16, 43], new Date(Date.now() + 3600000));
const settings = {
  schemaVersion: 2,
  kind: 'settings',
  id: 'local-settings',
  revision: 'r',
  savedAt: new Date().toISOString(),
  payload: {
    vessel,
    searchDefaults: future,
    units: 'nautical',
    offline: false,
    layers: { depth: true, bedding: true, marks: true },
    language: 'en',
    confirmed: { vessel: true, defaults: true },
    setupComplete: true,
  },
};
function record(expired: boolean, changed = false) {
  const time = '2026-01-01T00:00:00.000Z';
  const search = expired ? createDefaultSearch([16, 43], time) : future;
  return {
    schemaVersion: 2,
    kind: 'saved-plan',
    id: expired ? 'expired' : 'current',
    revision: 'rev',
    savedAt: time,
    payload: {
      name: expired ? 'Expired draft' : 'Harbour draft',
      createdAt: time,
      updatedAt: time,
      selectedPosition: [16.01, 43.01],
      plannedRodeM: 50,
      search,
      depthAllowancePercent: 20,
      vesselId: 'local-vessel',
      vesselFingerprint: changed ? 'a'.repeat(64) : hash,
      sourcePacks: [{ id: 'historical-pack', version: '1' }],
    },
  };
}
async function seed(page: Page, plans: unknown[], failFirst = false) {
  await page.addInitScript(
    ({ settings, plans, failFirst }) => {
      if (!sessionStorage.getItem('planner-test-seeded')) {
        localStorage.setItem('anchorai:v1:settings-v2', JSON.stringify(settings));
        localStorage.setItem('anchorai:v1:saved-plans-v2', JSON.stringify(plans));
        sessionStorage.setItem('planner-test-seeded', 'yes');
      }
      if (failFirst) {
        const set = Storage.prototype.setItem;
        let fail = true;
        Storage.prototype.setItem = function (key, value) {
          if (key === 'anchorai:v1:saved-plans-v2' && fail) {
            fail = false;
            throw new Error('simulated disk failure');
          }
          return set.call(this, key, value);
        };
      }
    },
    { settings, plans, failFirst },
  );
  await page.context().grantPermissions(['geolocation']);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition(success: (value: unknown) => void) {
          (window as any).__finishGPS = () =>
            success({
              coords: {
                latitude: 44,
                longitude: 17,
                accuracy: 5,
                altitude: null,
                altitudeAccuracy: null,
                heading: null,
                speed: null,
              },
              timestamp: Date.now(),
            });
        },
        watchPosition() {
          return 1;
        },
        clearWatch() {},
      },
    });
  });
  await page.route('**/v1/regions/discover', async (route) => {
    const request = route.request().postDataJSON();
    const pack = createEmptyRegion(request.center, request.radiusNm, 'Test area');
    await route.fulfill({ json: { pack, providers: [], notices: [], partial: true } });
  });
  await page.goto('/');
}
async function openSaved(page: Page) {
  await page.getByRole('tab', { name: 'Saved', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Saved', exact: true })).toBeVisible();
}

test('draft reload, failure retry, changed evidence notice and watch navigation', async ({
  page,
}) => {
  await seed(page, [record(false, true)], true);
  await openSaved(page);
  await btn(page, 'Open & reassess').click();
  await expect(page.getByRole('heading', { name: 'Anchor plan', exact: true })).toBeVisible();
  await expect(page.getByText(/Vessel or equipment has changed/)).toBeVisible();
  await expect(
    page.getByText(/Evidence sources or versions have changed or are unavailable/),
  ).toBeVisible();
  await expect(field(page, 'Latitude')).toHaveValue('43.01');
  await field(page, 'Plan name').fill('Retried draft');
  await btn(page, 'Save draft').click();
  await expect(page.getByText(/Could not save the draft/)).toBeVisible();
  await expect(field(page, 'Plan name')).toHaveValue('Retried draft');
  await btn(page, 'Save draft').click();
  await expect(page.getByText(/Plan draft saved/)).toBeVisible();
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('anchorai:v1:saved-plans-v2')!),
  );
  expect(stored).toHaveLength(1);
  expect(stored[0].id).toBe('current');
  expect(stored[0].payload.plannedRodeM).toBe(50);
  await page.reload();
  await openSaved(page);
  await expect(page.getByText('Retried draft', { exact: true })).toBeVisible();
  await btn(page, 'Open & reassess').click();
  await expect(field(page, 'Latitude')).toHaveValue('43.01');
  await expect(page.getByRole('checkbox', { name: /Confirm actual depth/ })).not.toBeChecked();
  const check = page.getByRole('checkbox', { name: /Confirm actual depth/ });
  await check.click();
  await expect(check).toBeChecked();
  await field(page, 'Latitude').fill('99');
  await expect(check).not.toBeChecked();
  await btn(page, 'Review invalid inputs').click();
  await expect(field(page, 'Latitude')).toBeFocused();
  await field(page, 'Latitude').fill('43.02');
  await field(page, 'Longitude').fill('16.02');
  await btn(page, 'Choose point on map').click();
  await btn(page, 'Cancel map selection').click();
  await expect(field(page, 'Latitude')).toHaveValue('43.02');
  await btn(page, 'Use current position').click();
  await expect(btn(page, 'Cancel location request')).toBeVisible();
  await page.waitForFunction(() => typeof (window as any).__finishGPS === 'function');
  await field(page, 'Latitude').fill('43.03');
  await page.evaluate(() => (window as any).__finishGPS());
  await expect(field(page, 'Latitude')).toHaveValue('43.03');
  await btn(page, 'View anchor watch requirements').click();
  await expect(page.getByRole('heading', { name: 'Native watch unavailable' })).toBeVisible();
});

test('expired draft asks for date review before opening planner', async ({ page }) => {
  await seed(page, [record(true)]);
  await openSaved(page);
  await btn(page, 'Open & reassess').click();
  await expect(page.getByRole('dialog', { name: 'Plan the stay' })).toBeVisible();
  await expect(page.getByText(/stay has ended/)).toBeVisible();
  await btn(page, 'Search this area').click();
  await expect(page.getByRole('heading', { name: 'Anchor plan', exact: true })).toBeVisible();
  await expect(field(page, 'Latitude')).toHaveValue('43.01');
});
