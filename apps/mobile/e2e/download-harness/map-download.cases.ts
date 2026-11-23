import { expect, test, type Page, type Route } from '@playwright/test';
import type { Position } from '@anchor-buddy/domain';
import { createEmptyRegion } from '../../src/lib/regionalDataCore';

const center: Position = [18.65, 54.35];
const vesselName = 'Download Harness Vessel';
const tileTemplate = 'https://tiles.openfreemap.org/planet/20261101_080013_pt/{z}/{x}/{y}.pbf';
const button = (page: Page, name: string | RegExp) => page.getByRole('button', { name });
const field = (page: Page, name: string) => page.getByRole('textbox', { name, exact: true });
const combo = (page: Page, name: string) => page.getByRole('combobox', { name, exact: true });

async function completeSetup(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Set up Anchor Buddy' })).toBeVisible();
  await button(page, 'Configure vessel').click();
  for (const [name, value] of Object.entries({
    'Vessel name': vesselName,
    'Length overall': '10',
    Beam: '3.2',
    'Loaded draft': '1.6',
    Displacement: '5000',
    'Usable rode length': '55',
    'Bow roller above water': '1',
  }))
    await field(page, name).fill(value);
  await combo(page, 'Anchor design').click();
  await page.getByRole('option', { name: 'Modern scoop', exact: true }).click();
  await button(page, 'Save vessel & continue').click();
  await button(page, 'Configure defaults').click();
  await button(page, 'Save defaults').click();
  await button(page, 'Continue to app tour').click();
  await button(page, 'Skip tour').click();
  await expect(page.getByText('No active search', { exact: true })).toBeVisible();
}

function deferred() {
  let release = () => {};
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

async function installControlledServices(
  page: Page,
  options: { pauseAtZoomOne?: boolean; evidenceFails?: boolean } = {},
) {
  const origin = new URL(page.url()).origin;
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return url.origin === origin ? route.continue() : route.abort('blockedbyclient');
  });

  const planet = deferred();
  const planetStarted = deferred();
  const zoomOne = deferred();
  const zoomOneStarted = deferred();
  let holdPlanet = false;
  let holdZoomOne = false;

  await page.route('**/v1/maps/resource**', async (route: Route) => {
    const requestUrl = new URL(route.request().url());
    const remote = requestUrl.searchParams.get('url');
    if (!remote) {
      await route.fulfill({ status: 400, body: 'Missing resource URL' });
      return;
    }
    const resource = new URL(remote);
    if (resource.pathname.endsWith('/planet')) {
      if (holdPlanet) {
        planetStarted.release();
        await planet.promise;
      }
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ tiles: [tileTemplate] }),
      });
      return;
    }
    if (resource.pathname.includes('/fonts/')) {
      await route.fulfill({ contentType: 'application/x-protobuf', body: Buffer.from([1, 2, 3]) });
      return;
    }
    if (holdZoomOne && /\/1\//.test(resource.pathname)) {
      zoomOneStarted.release();
      await zoomOne.promise;
    }
    // Empty vector tiles contain no labels but are valid test input for the local tile reader.
    await route.fulfill({ contentType: 'application/x-protobuf', body: Buffer.alloc(0) });
  });

  await page.route('**/v1/regions/discover', async (route) => {
    if (options.evidenceFails) {
      await route.fulfill({
        status: 503,
        json: { message: 'Controlled evidence service failure.' },
      });
      return;
    }
    const request = route.request().postDataJSON() as { center: Position; radiusNm: number };
    await route.fulfill({
      json: {
        pack: createEmptyRegion(request.center, request.radiusNm, 'Controlled map evidence'),
        providers: [],
        notices: [],
        partial: true,
      },
    });
  });

  return {
    holdPlanet: (hold: boolean) => {
      holdPlanet = hold;
    },
    releasePlanet: planet.release,
    planetStarted: planetStarted.promise,
    holdZoomOne: (hold: boolean) => {
      holdZoomOne = hold;
    },
    releaseZoomOne: zoomOne.release,
    zoomOneStarted: zoomOneStarted.promise,
  };
}

async function chooseSmallMapArea(page: Page) {
  await button(page, 'Download a map area').click();
  await button(page, 'Browse coastal regions').click();
  await button(page, /Choose Palma · Balearic Islands, Spain/).click();
  await field(page, 'Download radius').fill('0.25');
  await combo(page, 'Map detail').click();
  await page.getByRole('option', { name: 'Coastal overview', exact: true }).click();
}

test('download stages show preparation, coarse partial readiness, pause, resume, and completion', async ({
  page,
}, testInfo) => {
  await completeSetup(page);
  const controlled = await installControlledServices(page, { pauseAtZoomOne: true });
  controlled.holdPlanet(true);
  controlled.holdZoomOne(true);
  await chooseSmallMapArea(page);

  await button(page, 'Download selected area').click();
  await expect(page.getByText('Preparing map metadata and required resources.')).toBeVisible();
  await controlled.planetStarted;
  controlled.releasePlanet();
  await expect(page.getByText(/Partial map is ready through zoom 0/)).toBeVisible({
    timeout: 30_000,
  });
  await controlled.zoomOneStarted;
  await expect(page.getByText('Places & weather · Starts after map files complete')).toBeVisible();
  await testInfo.attach('coarse-map-ready-paused', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
  await button(page, 'Pause download').click();
  controlled.releaseZoomOne();
  await expect(page.getByText(/Download paused\. Resume it from Saved/)).toBeVisible();
  await expect(page.getByText('Map tiles & required fonts · Paused · partial')).toBeVisible();
  await expect(button(page, 'Resume download')).toBeVisible();

  controlled.holdPlanet(false);
  controlled.holdZoomOne(false);
  await button(page, 'Resume download').click();
  await expect(page.getByText('Map tiles & required fonts · Complete')).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText('Places & weather · Complete')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Map and available regional evidence saved/)).toBeVisible();
  await testInfo.attach('map-and-evidence-complete', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });

  await button(page, /^Close dialog$/).click();
  await page.getByRole('tab', { name: 'Settings', exact: true }).click();
  await page.getByRole('switch', { name: 'Offline planning', exact: true }).click();
  await page.getByRole('tab', { name: 'Saved', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Saved maps · 1', exact: true })).toBeVisible();
  await button(page, /^Open map$/).click();
  await expect(page.getByText('Downloaded basemap available in saved areas')).toBeVisible();
  await expect(page.getByText('No downloaded basemap confirmed')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('saved-basemap-offline-390x844.png') });
});

test('map completion and regional evidence failure remain separate outcomes', async ({
  page,
}, testInfo) => {
  await completeSetup(page);
  const controlled = await installControlledServices(page, { evidenceFails: true });
  await chooseSmallMapArea(page);
  await button(page, 'Download selected area').click();
  await expect(page.getByText('Map tiles & required fonts · Complete')).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText('Places & weather · Failed · map remains saved')).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText(/map is saved, but area data could not be downloaded/)).toBeVisible();
  await expect(button(page, 'Retry places and weather')).toBeVisible();
  await testInfo.attach('map-complete-evidence-failed', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
  controlled.releasePlanet();
  controlled.releaseZoomOne();
  await button(page, /^Close dialog$/).click();
  await page.getByRole('tab', { name: 'Saved', exact: true }).click();
  await button(page, 'Delete map').click();
  await page.evaluate(() => {
    const original = CacheStorage.prototype.delete;
    CacheStorage.prototype.delete = async function (key) {
      const removed = await original.call(this, key);
      if (key.startsWith('anchorbuddy-world-map-v1-')) {
        CacheStorage.prototype.delete = original;
        throw new Error('Controlled failure after map files were removed');
      }
      return removed;
    };
  });
  await page.getByRole('dialog').getByRole('button', { name: 'Delete map', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Controlled failure after map files');
  await button(page, 'Keep it').click();
  await expect(page.getByText(/Removal incomplete · unavailable/)).toBeVisible();
  await expect(button(page, /^Open map$/)).toHaveCount(0);
  await page.reload();
  await page.getByRole('tab', { name: 'Saved', exact: true }).click();
  await expect(page.getByText(/Removal incomplete · unavailable/)).toBeVisible();
  await expect(button(page, /^Open map$/)).toHaveCount(0);
  await testInfo.attach('incomplete-map-removal-after-reload', {
    body: await page.screenshot({ fullPage: true }), contentType: 'image/png',
  });
  await button(page, 'Delete map').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete map', exact: true }).click();
  await expect(page.getByText('No saved map areas', { exact: true })).toBeVisible();
  await expect(page.locator('#saved-library-heading')).toBeFocused();
});
